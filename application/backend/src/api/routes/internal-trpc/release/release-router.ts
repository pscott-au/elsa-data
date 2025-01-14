import { z } from "zod";
import {
  calculateOffset,
  internalProcedure,
  router,
} from "../../trpc-bootstrap";
import {
  inputPaginationParameter,
  inputReleaseKeySingle,
} from "../input-schemas-common";

const htsgetRestriction = z.object({
  restriction: z.union([
    z.literal("CongenitalHeartDefect"),
    z.literal("Autism"),
    z.literal("Achromatopsia"),
  ]),
});

/**
 * RPC for release
 */
export const releaseRouter = router({
  getAllRelease: internalProcedure
    .input(inputPaginationParameter)
    .query(async ({ input, ctx }) => {
      const { user, pageSize } = ctx;
      const { page = 1 } = input;

      return await ctx.releaseService.getAll(
        user,
        pageSize,
        calculateOffset(page, pageSize)
      );
    }),
  getSpecificRelease: internalProcedure
    .input(inputReleaseKeySingle)
    .query(async ({ input, ctx }) => {
      const { user } = ctx;
      const { releaseKey } = input;

      return await ctx.releaseService.get(user, releaseKey);
    }),
  getReleaseConsent: internalProcedure
    .input(inputReleaseKeySingle.merge(z.object({ nodeId: z.string() })))
    .query(async ({ input, ctx }) => {
      const { user } = ctx;
      const { releaseKey, nodeId } = input;

      return await ctx.releaseSelectionService.getNodeConsent(
        user,
        releaseKey,
        nodeId
      );
    }),
  applyHtsgetRestriction: internalProcedure
    .input(inputReleaseKeySingle.merge(htsgetRestriction))
    .mutation(async ({ input, ctx }) => {
      const { user } = ctx;
      const { releaseKey, restriction } = input;

      return await ctx.releaseService.applyHtsgetRestriction(
        user,
        releaseKey,
        restriction
      );
    }),
  removeHtsgetRestriction: internalProcedure
    .input(inputReleaseKeySingle.merge(htsgetRestriction))
    .mutation(async ({ input, ctx }) => {
      const { user } = ctx;
      const { releaseKey, restriction } = input;

      return await ctx.releaseService.removeHtsgetRestriction(
        user,
        releaseKey,
        restriction
      );
    }),
});
