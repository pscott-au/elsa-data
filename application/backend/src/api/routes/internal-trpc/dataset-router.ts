import { z } from "zod";
import { calculateOffset, internalProcedure, router } from "../trpc-bootstrap";
import { inputPaginationParameter } from "./input-schemas-common";

/**
 * Defining a of zod input construct
 */
const inputIncludeDeletedFile = z.object({
  includeDeletedFile: z.boolean().optional(),
});
const inputSingleDatasetUri = z.object({
  datasetUri: z.string(),
});

/**
 * RPC for Datasets
 */
export const datasetRouter = router({
  getConfiguredDatasets: internalProcedure.query(async ({ input, ctx }) => {
    const { user } = ctx;

    return ctx.datasetService.getConfigured(user);
  }),
  getAllDataset: internalProcedure
    .input(inputPaginationParameter)
    .query(async ({ input, ctx }) => {
      const { user, pageSize } = ctx;
      const { page = 1 } = input;

      return await ctx.datasetService.getAll({
        user,
        limit: pageSize,
        offset: calculateOffset(page, pageSize),
      });
    }),
  getSingleDataset: internalProcedure
    .input(inputIncludeDeletedFile.merge(inputSingleDatasetUri))
    .query(async ({ input, ctx }) => {
      const { user } = ctx;
      const { datasetUri, includeDeletedFile = false } = input;
      return await ctx.datasetService.get(user, datasetUri, includeDeletedFile);
    }),
  updateDataset: internalProcedure
    .input(inputSingleDatasetUri)
    .mutation(async ({ input, ctx }) => {
      const { user } = ctx;
      const { datasetUri } = input;

      // just to work out which service we want to use we ask about the loader for this URI
      // NOTE we can do all this work without worrying about the calling user because
      // the list of datasets URIs is already publicly available
      // and then the loading service will do their own permission checks
      const loader = ctx.datasetService.getLoaderFromFromDatasetUri(datasetUri);

      switch (loader) {
        case "australian-genomics-directories":
          await ctx.agS3IndexService.syncWithDatabaseFromDatasetUri(
            datasetUri,
            user,
            loader
          );
          break;
        default:
          throw Error(`Unknown dataset or loader for URI ${datasetUri}`);
      }
    }),
  getDatasetConsent: internalProcedure
    .input(
      z.object({
        consentId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { user } = ctx;
      const { consentId } = input;

      return await ctx.datasetService.getDatasetsConsent(user, consentId);
    }),
});
