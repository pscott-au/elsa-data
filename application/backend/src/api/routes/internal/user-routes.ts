import { FastifyInstance } from "fastify";
import {
  authenticatedRouteOnEntryHelper,
  sendPagedResult,
} from "../../api-internal-routes";
import { DependencyContainer } from "tsyringe";
import { UserService } from "../../../business/services/user-service";
import { UserSummaryType } from "@umccr/elsa-types/schemas-users";
import { getServices } from "../../../di-helpers";

export const userRoutes = async (
  fastify: FastifyInstance,
  _opts: { container: DependencyContainer }
) => {
  const userService = _opts.container.resolve(UserService);
  const { settings } = getServices(_opts.container);

  fastify.get<{ Reply: UserSummaryType[] }>(
    "/users",
    {},
    async function (request, reply) {
      const { authenticatedUser, pageSize, page } =
        authenticatedRouteOnEntryHelper(request);

      // if (!isSuperAdmin(settings, authenticatedUser)) {
      //   reply.status(404);
      //   return;
      // }

      const users = await userService.getUsers(
        authenticatedUser,
        pageSize,
        (page - 1) * pageSize
      );

      sendPagedResult(reply, users);
    }
  );
};
