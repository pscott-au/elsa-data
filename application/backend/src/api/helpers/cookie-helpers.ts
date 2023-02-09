import { FastifyReply, FastifyRequest } from "fastify";

/**
 * Set a cookie for use in a frontend UI.
 *
 * @param request
 * @param reply
 * @param k
 * @param v
 */
export function cookieForUI(
  request: FastifyRequest,
  reply: FastifyReply,
  k: string,
  v: string
) {
  return reply.setCookie(k, v, {
    path: "/",
    secure: true,
    httpOnly: false,
    maxAge: 24 * 60 * 60, // 1 day (in seconds)
  });
}

/**
 * Set a cookie for use in a backend.
 *
 * @param request
 * @param reply
 * @param k
 * @param v
 */
export function cookieForBackend(
  request: FastifyRequest,
  reply: FastifyReply,
  k: string,
  v: any
) {
  request.session.options({
    maxAge: 24 * 60 * 60, // 1 day (in seconds)
  });
  request.session.set(k, v);
}