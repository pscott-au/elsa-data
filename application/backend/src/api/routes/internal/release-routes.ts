import { FastifyInstance } from "fastify";
import {
  DuoLimitationCodedType,
  ReleaseCaseType,
  ReleaseManualSchema,
  ReleaseManualType,
  ReleasePatchOperationsSchema,
  ReleasePatchOperationsType,
  ReleasePresignRequestSchema,
  ReleasePresignRequestType,
} from "@umccr/elsa-types";
import {
  authenticatedRouteOnEntryHelper,
  sendPagedResult,
} from "../../api-internal-routes";
import { DependencyContainer } from "tsyringe";
import { ReleaseService } from "../../../business/services/release-service";
import { AwsAccessPointService } from "../../../business/services/aws/aws-access-point-service";
import { GcpStorageSharingService } from "../../../business/services/gcp-storage-sharing-service";
import { PresignedUrlService } from "../../../business/services/presigned-url-service";
import { ReleaseParticipationService } from "../../../business/services/release-participation-service";
import { ReleaseSelectionService } from "../../../business/services/release-selection-service";
import { ManifestService } from "../../../business/services/manifests/manifest-service";

export const releaseRoutes = async (
  fastify: FastifyInstance,
  _opts: { container: DependencyContainer }
) => {
  const presignedUrlService = _opts.container.resolve(PresignedUrlService);
  const awsAccessPointService = _opts.container.resolve(AwsAccessPointService);
  const gcpStorageSharingService = _opts.container.resolve(
    GcpStorageSharingService
  );
  const releaseService = _opts.container.resolve(ReleaseService);
  const releaseParticipantService = _opts.container.resolve(
    ReleaseParticipationService
  );
  const releaseSelectionService = _opts.container.resolve(
    ReleaseSelectionService
  );
  const manifestService = _opts.container.resolve(ManifestService);

  fastify.get<{ Params: { rid: string }; Reply: ReleaseCaseType[] }>(
    "/releases/:rid/cases",
    {},
    async function (request, reply) {
      const { authenticatedUser, pageSize, page, q } =
        authenticatedRouteOnEntryHelper(request);

      const releaseKey = request.params.rid;

      const cases = await releaseSelectionService.getCases(
        authenticatedUser,
        releaseKey,
        pageSize,
        (page - 1) * pageSize,
        q
      );

      sendPagedResult(reply, cases);
    }
  );

  fastify.get<{
    Params: { rid: string; nid: string };
    Reply: DuoLimitationCodedType[];
  }>("/releases/:rid/consent/:nid", {}, async function (request, reply) {
    const { authenticatedUser } = authenticatedRouteOnEntryHelper(request);

    const releaseKey = request.params.rid;
    const nodeId = request.params.nid;

    const r = await releaseSelectionService.getNodeConsent(
      authenticatedUser,
      releaseKey,
      nodeId
    );

    request.log.debug(r);

    reply.send(r);
  });

  /**
   * The main route for altering fields in a release. Normally the UI component for the
   * field is tied to a mutator which makes the corresponding patch operation.
   */
  fastify.patch<{
    Params: {
      rid: string;
    };
    Body: ReleasePatchOperationsType;
  }>(
    "/releases/:rid",
    {
      schema: {
        body: ReleasePatchOperationsSchema,
      },
    },
    async function (request, reply) {
      const { authenticatedUser } = authenticatedRouteOnEntryHelper(request);
      const releaseKey = request.params.rid;

      if (request.body.length > 1)
        // the JSON patch standard says that all operations if more than 1 need to succeed/fail
        // so we would need transactions to achieve this
        // until we hit a need for it - we just disallow
        throw new Error(
          "Due to our services not having transaction support we don't allow multiple operations in one PATCH"
        );

      for (const op of request.body) {
        switch (op.op) {
          case "add":
            switch (op.path) {
              case "/specimens":
                reply.send(
                  await releaseSelectionService.setSelected(
                    authenticatedUser,
                    releaseKey,
                    op.value
                  )
                );
                return;
              case "/applicationCoded/diseases":
                reply.send(
                  await releaseService.addDiseaseToApplicationCoded(
                    authenticatedUser,
                    releaseKey,
                    op.value.system,
                    op.value.code
                  )
                );
                return;
              case "/applicationCoded/countries":
                reply.send(
                  await releaseService.addCountryToApplicationCoded(
                    authenticatedUser,
                    releaseKey,
                    op.value.system,
                    op.value.code
                  )
                );
                return;
              default:
                throw new Error(
                  `Unknown "add" operation path ${(op as any).path}`
                );
            }

          case "remove":
            switch (op.path) {
              case "/specimens":
                reply.send(
                  await releaseSelectionService.setUnselected(
                    authenticatedUser,
                    releaseKey,
                    op.value
                  )
                );
                return;
              case "/applicationCoded/diseases":
                reply.send(
                  await releaseService.removeDiseaseFromApplicationCoded(
                    authenticatedUser,
                    releaseKey,
                    op.value.system,
                    op.value.code
                  )
                );
                return;
              case "/applicationCoded/countries":
                reply.send(
                  await releaseService.removeCountryFromApplicationCoded(
                    authenticatedUser,
                    releaseKey,
                    op.value.system,
                    op.value.code
                  )
                );
                return;
              default:
                throw new Error(
                  `Unknown "remove" operation path ${(op as any).path}`
                );
            }

          case "replace":
            switch (op.path) {
              case "/applicationCoded/type":
                reply.send(
                  await releaseService.setTypeOfApplicationCoded(
                    authenticatedUser,
                    releaseKey,
                    op.value as any
                  )
                );
                return;
              case "/applicationCoded/beacon":
                reply.send(
                  await releaseService.setBeaconQuery(
                    authenticatedUser,
                    releaseKey,
                    op.value
                  )
                );
                return;
              case "/allowedRead":
                reply.send(
                  await releaseService.setIsAllowed(
                    authenticatedUser,
                    releaseKey,
                    "isAllowedReadData",
                    op.value
                  )
                );
                return;
              case "/allowedVariant":
                reply.send(
                  await releaseService.setIsAllowed(
                    authenticatedUser,
                    releaseKey,
                    "isAllowedVariantData",
                    op.value
                  )
                );
                return;
              case "/allowedPhenotype":
                reply.send(
                  await releaseService.setIsAllowed(
                    authenticatedUser,
                    releaseKey,
                    "isAllowedPhenotypeData",
                    op.value
                  )
                );
                return;
              case "/allowedS3":
                reply.send(
                  await releaseService.setIsAllowed(
                    authenticatedUser,
                    releaseKey,
                    "isAllowedS3Data",
                    op.value
                  )
                );
                return;
              case "/allowedGS":
                reply.send(
                  await releaseService.setIsAllowed(
                    authenticatedUser,
                    releaseKey,
                    "isAllowedGSData",
                    op.value
                  )
                );
                return;
              case "/allowedR2":
                reply.send(
                  await releaseService.setIsAllowed(
                    authenticatedUser,
                    releaseKey,
                    "isAllowedR2Data",
                    op.value
                  )
                );
                return;
              case "/dataSharingConfiguration/objectSigningEnabled":
              case "/dataSharingConfiguration/objectSigningExpiryHours":
              case "/dataSharingConfiguration/copyOutEnabled":
              case "/dataSharingConfiguration/copyOutDestinationLocation":
              case "/dataSharingConfiguration/htsgetEnabled":
              case "/dataSharingConfiguration/awsAccessPointEnabled":
              case "/dataSharingConfiguration/awsAccessPointAccountId":
              case "/dataSharingConfiguration/awsAccessPointVpcId":
              case "/dataSharingConfiguration/gcpStorageIamEnabled":
              case "/dataSharingConfiguration/gcpStorageIamUsers":
                reply.send(
                  await releaseService.setDataSharingConfigurationField(
                    authenticatedUser,
                    releaseKey,
                    op.path,
                    op.value
                  )
                );
                return;
              default:
                throw new Error(
                  `Unknown "replace" operation path ${(op as any).path}`
                );
            }
          default:
            throw new Error(`Unknown operation op ${(op as any).op}`);
        }
      }
    }
  );

  // /**
  //  * @param binary Buffer
  //  * returns readableInstanceStream Readable
  //  */
  // function bufferToStream(binary: Buffer) {
  //   return new Readable({
  //     read() {
  //       this.push(binary);
  //       this.push(null);
  //     },
  //   });
  // }

  fastify.get<{
    Params: { rid: string };
  }>("/releases/:rid/cfn", {}, async function (request, reply) {
    const { authenticatedUser } = authenticatedRouteOnEntryHelper(request);

    const releaseKey = request.params.rid;

    const res = await awsAccessPointService.getInstalledAccessPointResources(
      authenticatedUser,
      releaseKey
    );

    reply.send(res);
  });

  fastify.post<{
    Body: ReleasePresignRequestType;
    Params: { rid: string };
  }>(
    "/releases/:rid/cfn/manifest",
    {
      schema: {
        body: ReleasePresignRequestSchema,
      },
    },
    async function (request, reply) {
      const { authenticatedUser } = authenticatedRouteOnEntryHelper(request);

      const releaseKey = request.params.rid;
      const presignHeaderArray = Array.isArray(request.body.presignHeader)
        ? request.body.presignHeader
        : [request.body.presignHeader];

      const accessPointTsv = await awsAccessPointService.getAccessPointFileList(
        authenticatedUser,
        releaseKey,
        presignHeaderArray
      );

      reply.header(
        "Content-disposition",
        `attachment; filename=${accessPointTsv.filename}`
      );
      reply.type("text/tab-separated-values");
      reply.send(accessPointTsv.content);
    }
  );

  fastify.post<{
    Body: ReleaseManualType;
    Reply: string;
  }>(
    "/release",
    {
      schema: {
        body: ReleaseManualSchema,
      },
    },
    async function (request, reply) {
      const { authenticatedUser } = authenticatedRouteOnEntryHelper(request);
      reply.send(await releaseService.new(authenticatedUser, request.body));
    }
  );

  fastify.post<{
    Params: { rid: string };
    Body: { users: string[] };
    Reply: number;
  }>(
    "/releases/:rid/gcp-storage/acls/add",
    {},
    async function (request, reply) {
      const { authenticatedUser } = authenticatedRouteOnEntryHelper(request);

      const releaseKey = request.params.rid;
      const users = request.body.users;

      reply.send(
        await gcpStorageSharingService.addUsers(
          authenticatedUser,
          releaseKey,
          users
        )
      );
    }
  );

  fastify.post<{
    Params: { rid: string };
    Body: { users: string[] };
    Reply: number;
  }>(
    "/releases/:rid/gcp-storage/acls/remove",
    {},
    async function (request, reply) {
      const { authenticatedUser } = authenticatedRouteOnEntryHelper(request);

      const releaseKey = request.params.rid;
      const users = request.body.users;

      reply.send(
        await gcpStorageSharingService.deleteUsers(
          authenticatedUser,
          releaseKey,
          users
        )
      );
    }
  );

  fastify.post<{
    Body?: ReleasePresignRequestType;
    Params: { rid: string };
  }>(
    "/releases/:rid/tsv-manifest-archive",
    {},
    async function (request, reply) {
      const { authenticatedUser } = authenticatedRouteOnEntryHelper(request);

      const presignHeader = request.body?.presignHeader ?? [];
      const presignHeaderArray = Array.isArray(presignHeader)
        ? presignHeader
        : [presignHeader];

      const releaseKey = request.params.rid;

      const manifest = await manifestService.getActiveTsvManifestAsArchive(
        presignedUrlService,
        authenticatedUser,
        releaseKey,
        presignHeaderArray
      );

      if (!manifest) {
        reply.status(404).send();
        return;
      }

      reply.raw.writeHead(200, {
        "Content-Disposition": `attachment; filename=manifest-${releaseKey}.zip`,
        "Content-Type": "application/octet-stream",
      });

      manifest.pipe(reply.raw);
    }
  );

  fastify.post<{
    Body?: ReleasePresignRequestType;
    Params: { rid: string };
  }>(
    "/releases/:rid/tsv-manifest-plaintext",
    {},
    async function (request, reply) {
      const { authenticatedUser } = authenticatedRouteOnEntryHelper(request);

      const presignHeader = request.body?.presignHeader ?? [];
      const presignHeaderArray = Array.isArray(presignHeader)
        ? presignHeader
        : [presignHeader];

      if (presignHeader.includes("objectStoreSigned")) {
        // This would ideally be checked with an appropriate type for the request
        // `Body`. But that'd involve defining a separate type almost identical
        // to `ReleasePresignRequestType`, which is too repetitious for my taste.
        reply.status(400).send();
        return;
      }

      const releaseKey = request.params.rid;

      const manifest = await manifestService.getActiveTsvManifestAsString(
        presignedUrlService,
        authenticatedUser,
        releaseKey,
        presignHeaderArray
      );

      if (!manifest) {
        reply.status(404).send();
        return;
      }

      reply
        .status(200)
        .header(
          "Content-Disposition",
          `attachment; filename=manifest-${releaseKey}.tsv`
        )
        .header("Content-Type", "text/tab-separated-values")
        .send(manifest);
    }
  );
};
