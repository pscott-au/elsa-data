import Fastify, { FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import fastifySecureSession from "@fastify/secure-session";
import fastifyFormBody from "@fastify/formbody";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyCsrfProtection from "@fastify/csrf-protection";
import fastifyTraps from "@dnlup/fastify-traps";
import {
  locateHtmlDirectory,
  serveCustomIndexHtml,
  strictServeRealFileIfPresent,
} from "./app-helpers";
import { ErrorHandler } from "./api/errors/_error.handler";
import { apiInternalRoutes } from "./api/api-internal-routes";
import { apiAuthRoutes, callbackRoutes } from "./api/api-auth-routes";
import { DependencyContainer } from "tsyringe";
import { ElsaSettings } from "./config/elsa-settings";
import { Logger } from "pino";
import { apiExternalRoutes } from "./api/api-external-routes";
import { apiUnauthenticatedRoutes } from "./api/api-unauthenticated-routes";
import { getMandatoryEnv, IndexHtmlTemplateData } from "./app-env";
import { Context } from "./api/routes/trpc-bootstrap";
import { getSecureSessionOptions } from "./api/auth/session-cookie-helpers";
import { trpcRoutes } from "./api/api-trpc-routes";
import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import * as fs from "fs";
import * as mime from "mime-types";

export class App {
  public readonly server: FastifyInstance;

  // a absolute path to where static files are to be served from
  public readonly staticFilesPath: string;

  private readonly trpcCreateContext: (
    opts: CreateFastifyContextOptions
  ) => Promise<Context>;

  /**
   * Our constructor does all the setup that can be done without async/await
   * (increasingly almost nothing). It should check settings and establish
   * anything that cannot be changed.
   *
   * @param dc
   * @param settings
   * @param logger
   * @param features
   */
  constructor(
    private readonly dc: DependencyContainer,
    private readonly settings: ElsaSettings,
    private readonly logger: Logger,
    private readonly features: ReadonlySet<string>
  ) {
    // find where our website HTML is
    this.staticFilesPath = locateHtmlDirectory(true);

    this.server = Fastify({
      logger: logger,
      // needed for supporting TRPC queries (that can get very long!)
      maxParamLength: 5000,
      // consider if this should be a setting - but currently we are always deploying behind a load balancer
      // that will act as a trusted proxy
      trustProxy: true,
    });

    // inject a copy of the Elsa settings and a custom child DI container into every Fastify request
    this.server.decorateRequest("settings", null);
    this.server.decorateRequest("container", null);

    this.server.addHook("onRequest", async (req, reply) => {
      // we make a shallow copy of the settings on each fastify request to (somewhat)
      // protect against routes doing mutations
      (req as any).settings = { ...settings };
      // give each request its own DI container
      (req as any).container = dc.createChildContainer();
      (req as any).features = features;
    });

    // similarly for TRPC, start each request context with a copy of the Elsa settings and a custom child DI container
    this.trpcCreateContext = async (opts: CreateFastifyContextOptions) => ({
      settings: { ...settings },
      container: dc.createChildContainer(),
      features: features,
      req: opts.req,
      res: opts.res,
    });
  }

  /**
   * The asynchronous portion of the server setup.
   */
  public async setupServer(): Promise<FastifyInstance> {
    // register global fastify plugins
    {
      // we want our server to quickly shutdown in response to TERM signals - enabling our
      // other infrastructure (load balancers, ecs etc) to be totally in charge of keeping us
      // running as a service
      // this sets up traps to do it gracefully however
      // we have added strict: false because integration tests we run multiple servers one after each other
      // and were getting left over SIGINT registrations
      await this.server.register(fastifyTraps, { strict: false });

      await this.server.register(fastifyFormBody);

      await this.server.register(fastifyHelmet, {
        contentSecurityPolicy: {
          directives: {
            // TODO: derive form action hosts from configuration of OIDC
            formAction: ["'self'", "https:", "*.cilogon.org", "cilogon.org"],
            // our front end needs to be able to make fetches from ontoserver
            connectSrc: ["'self'", new URL(this.settings.ontoFhirUrl).host],
          },
        },
      });

      await this.server.register(fastifyStatic, {
        root: this.staticFilesPath,
        serve: false,
      });

      await this.server.register(
        fastifySecureSession,
        getSecureSessionOptions(this.settings)
      );

      await this.server.register(fastifyCsrfProtection, {
        sessionPlugin: "@fastify/secure-session",
      });

      // set rate limits across the entire app surface - including APIs and HTML
      // NOTE: this rate limit is also applied in the NotFound handler
      // NOTE: we may need to consider moving this only to the /api section
      await this.server.register(
        fastifyRateLimit,
        this.settings.httpHosting.rateLimit
      );
    }

    this.server.setErrorHandler(ErrorHandler);

    this.server.ready(() => {
      // only enable if we are having problems with API routing
      // this.logger.debug(this.server.printRoutes({ commonPrefix: false }));
    });

    await this.server.register(trpcRoutes, {
      prefix: "/api/trpc",
      trpcCreateContext: this.trpcCreateContext,
    });

    this.server.register(apiExternalRoutes, {
      prefix: "/api",
      container: this.dc,
    });

    this.server.register(apiInternalRoutes, {
      prefix: "/api",
      container: this.dc,
      allowTestCookieEquals: undefined,
    });

    this.server.register(apiUnauthenticatedRoutes, {
      prefix: "/api",
      container: this.dc,
      addDevTestingRoutes: this.settings.devTesting?.allowTestRoutes ?? false,
    });

    // TODO: think about how/where auth routes can go
    //       including callback as a special case (because it has to be registered with the OIDC provider)
    this.server.register(apiAuthRoutes, {
      prefix: "/auth",
      container: this.dc,
      redirectUri: this.settings.deployedUrl + "/cb",
      includeTestUsers: this.settings.devTesting?.allowTestUsers ?? false,
    });

    this.server.register(callbackRoutes, {
      prefix: "/cb",
      container: this.dc,
      redirectUri: this.settings.deployedUrl + "/cb",
      includeTestUsers: this.settings.devTesting?.allowTestUsers ?? false,
    });

    // our behaviour for React routed websites is that NotFound responses should be replaced
    // with serving up index.html
    this.server.setNotFoundHandler(
      // note we rate limit our not found handler too
      { preHandler: this.server.rateLimit() },
      async (request, reply) => {
        // any misses that fall through in the API area should actually return 404
        // we don't want to serve up index.html for mistaken API calls
        if (request.url.toLowerCase().startsWith("/api/")) {
          reply
            .code(404)
            .type("application/problem+json")
            .send({
              type: "about:blank",
              title: "Not Found",
              status: 404,
              detail: `API route ${request.url} does not exist`,
            });

          return;
        }

        // our react routes should never have file suffixes so we don't serve up index.html in those cases
        // (this helps us not serving up index.html for random misplaced PNG requests etc)
        if (request.url.includes(".")) {
          reply
            .code(404)
            .type("application/problem+json")
            .send({
              type: "about:blank",
              title: "Not Found",
              status: 404,
              detail: `File ${request.url} does not exist`,
            });

          return;
        }

        // the user hit refresh at (for example) https://ourwebsite.com/docs/a32gf24 - for react routes like
        // this we actually want to send the index content (at which point react routing takes over)

        await serveCustomIndexHtml(
          reply,
          this.staticFilesPath,
          this.buildIndexHtmlTemplateData()
        );
      }
    );

    const logoUriRelative = this.settings.branding?.logoUriRelative;
    const logoPath = this.settings.branding?.logoPath;
    if (logoUriRelative && logoPath) {
      await this.server.get(logoUriRelative, async (_, reply) => {
        const mimeType = mime.lookup(logoPath);
        if (mimeType === false) return reply.status(500);
        return reply
          .type(mimeType)
          .header("Cache-Control", "public, max-age=3600, immutable")
          .send(fs.createReadStream(logoPath));
      });
    }

    this.server.get("*", async (request, reply) => {
      const requestPath = request.url;

      // we can short circuit out of any fancy handling if it is very explicit that they want the index
      if (requestPath === "/" || requestPath.endsWith("/index.html")) {
        return await serveCustomIndexHtml(
          reply,
          this.staticFilesPath,
          this.buildIndexHtmlTemplateData()
        );
      }

      if (requestPath === "/sockjs-node") {
        reply.status(404).send();
      } else {
        await strictServeRealFileIfPresent(reply, requestPath);
      }
    });

    return this.server;
  }

  /**
   * Builds context for all HTML templating
   * including a special data attribute that is used for injecting data into React.
   *
   * We can do any type of environment mapping/injection we want here.
   *
   * This can fetch values from any source we want
   * - environment variables passed in via CloudFormation
   * - secrets
   * - parameter store
   * - request variables
   */
  private buildIndexHtmlTemplateData(): IndexHtmlTemplateData {
    let dataAttributes = "";

    const escapeHtml = (unsafe: string) => {
      return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
          case '"':
            return "&quot;";
          case "&":
            return "&amp;";
          case "<":
            return "&lt;";
          case ">":
            return "&gt;";
          default:
            return c;
        }
      });
    };

    const addAttribute = (k: string, v: string) => {
      dataAttributes = dataAttributes + `\t\t${k}="${escapeHtml(v)}"\n`;
    };

    const brandName = this.settings.branding?.brandName;
    const documentTitle = brandName ? `Elsa Data – ${brandName}` : "Elsa Data";

    // these are env variables set in the solution deployment stack - probably via Cloud Formation parameters but also
    // locally they can be set just by shell env variables
    // Maps all the *deploy* time (stack) and *view* time (from browser fetching index.html)
    // environment data into data-attributes that will be
    // passed into the React app.
    addAttribute("data-version", getMandatoryEnv("ELSA_DATA_VERSION"));
    addAttribute("data-built", getMandatoryEnv("ELSA_DATA_BUILT"));
    addAttribute("data-revision", getMandatoryEnv("ELSA_DATA_REVISION"));
    addAttribute(
      "data-deployed-environment",
      this.settings.devTesting ? "development" : "production"
    );
    addAttribute(
      "data-terminology-fhir-url",
      this.settings.ontoFhirUrl ?? "undefined"
    );
    if (this.features.size > 0)
      addAttribute(
        "data-features",
        Array.from(this.features.values()).join(" ")
      );
    addAttribute("data-document-title", documentTitle ?? "");
    addAttribute("data-brand-name", this.settings.branding?.brandName ?? "");
    addAttribute(
      "data-brand-logo-uri-relative",
      this.settings.branding?.logoUriRelative ?? ""
    );

    return {
      document_title: documentTitle,
      data_attributes: dataAttributes,
    };
  }
}
