import { App } from "./app";
import { insertTestData } from "./test-data/insert-test-data";
import { blankTestData } from "./test-data/blank-test-data";
import Bree from "bree";
import { container } from "tsyringe";
import path from "path";
import { ElsaSettings } from "./config/elsa-settings";
import { sleep } from "edgedb/dist/utils";
import { getFromEnv } from "./entrypoint-command-helper";
import { DatasetService } from "./business/services/dataset-service";

export const WEB_SERVER_COMMAND = "web-server";
export const WEB_SERVER_WITH_SCENARIO_COMMAND = "web-server-with-scenario";

/**
 * A command that starts (and waits) for the Elsa Data web server to serve
 * the Elsa Data application.
 *
 * @param scenario
 */
export async function startWebServer(scenario: number | null): Promise<number> {
  const settings = await getFromEnv();

  container.register<ElsaSettings>("Settings", {
    useValue: settings,
  });

  // in a real deployment - "add scenario", "db blank" etc would all be handled by 'commands'.
  // we have one dev use case though - where we nodemon the local code base and restart the server
  // each time code changes - and in that case we want the server startup itself to set up the db
  if (scenario) {
    if (process.env.NODE_ENV === "development") {
      console.log(`Resetting the database to contain scenario ${scenario}`);

      await blankTestData();
      // TODO allow different scenarios to be inserted based on the value
      await insertTestData(settings);
    } else {
      // a simple guard to hopefully stop an accident in prod
      console.log(
        "Only 'development' Node environments can start the web server with a scenario - as scenarios will blank out the existing data"
      );

      return 1;
    }
  }

  // Insert datasets from config
  const datasetService = container.resolve(DatasetService);
  datasetService.configureDataset(settings.datasets);

  console.log("Starting job queue");

  const bree = new Bree({
    root: path.resolve("jobs"),
    jobs: [
      {
        name: "select-job.ts",
        timeout: "5s",
        interval: "20s",
      },
    ],
  });

  await bree.start();

  const app = new App(settings);

  const server = await app.setupServer();

  console.log(`Listening on ${settings.host} on port ${settings.port}`);

  try {
    // this waits until the server has started up - but does not wait for the server to close down
    // to best support Docker - which will be our normal deployment - we listen on 0.0.0.0
    await server.listen({ port: settings.port, host: settings.host });

    // TODO possibly replace Bree with our own direct Jobs query and handle that here

    // we don't want to fall out the end of the 'start-server' command until we have been signalled
    // to shut down
    while (true) {
      // TODO detect close() event from the server
      await sleep(5000);
    }
  } catch (err) {
    server.log.error(err);

    return 1;
  }
}