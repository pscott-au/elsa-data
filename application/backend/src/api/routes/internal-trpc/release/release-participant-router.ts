import {
  calculateOffset,
  internalProcedure,
  router,
} from "../../trpc-bootstrap";
import { z } from "zod";
import {
  inputPaginationParameter,
  inputReleaseKey,
  inputReleaseKeySingle,
} from "../input-schemas-common";
import {
  ReleaseParticipantRoleType,
  ReleaseParticipantRole,
  ReleaseParticipantRoleConst,
} from "@umccr/elsa-types";

/**
 * RPC for release participants
 */

export const releaseParticipantRouter = router({
  getParticipants: internalProcedure
    .input(inputPaginationParameter.merge(inputReleaseKeySingle))
    .query(async ({ input, ctx }) => {
      const { user, pageSize, res: reply } = ctx;
      const { releaseKey, page = 1 } = input;

      return await ctx.releaseParticipantService.getParticipants(
        user,
        releaseKey,
        pageSize,
        calculateOffset(page, pageSize)
      );
    }),
  addParticipant: internalProcedure
    .input(
      z.object({
        releaseKey: inputReleaseKey,
        email: z.string(),
        role: z.enum(ReleaseParticipantRoleConst),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { user } = ctx;
      const { releaseKey, email, role } = input;

      return ctx.releaseParticipantService.addParticipant(
        user,
        releaseKey,
        email,
        role
      );
    }),

  editParticipant: internalProcedure
    .input(
      z.object({
        releaseKey: inputReleaseKey,
        email: z.string(),
        role: z.enum(ReleaseParticipantRoleConst),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { user } = ctx;
      const { releaseKey, email, role } = input;

      return ctx.releaseParticipantService.editParticipant(
        user,
        releaseKey,
        email,
        role
      );
    }),

  removeParticipant: internalProcedure
    .input(
      z.object({
        releaseKey: inputReleaseKey,
        email: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { user } = ctx;
      const { releaseKey, email } = input;

      return ctx.releaseParticipantService.removeParticipant(
        user,
        releaseKey,
        email
      );
    }),
});
