// the base Javascript Error interface has
// interface Error {
//     name: string;
//     message: string;
//     stack?: string;
// }

// we are interested in introducing a proper RFC 7807 system so will re-use those standard error fields
// where possible - but renaming them into the response JSON

/*
A problem details object can have the following members:

   o  "type" (string) - A URI reference [RFC3986] that identifies the
      problem type.  This specification encourages that, when
      dereferenced, it provide human-readable documentation for the
      problem type (e.g., using HTML [W3C.REC-html5-20141028]).  When
      this member is not present, its value is assumed to be
      "about:blank".

   o  "title" (string) - A short, human-readable summary of the problem
      type.  It SHOULD NOT change from occurrence to occurrence of the
      problem, except for purposes of localization (e.g., using
      proactive content negotiation; see [RFC7231], Section 3.4).

   o  "status" (number) - The HTTP status code ([RFC7231], Section 6)
      generated by the origin server for this occurrence of the problem.

   o  "detail" (string) - A human-readable explanation specific to this
      occurrence of the problem.

   o  "instance" (string) - A URI reference that identifies the specific
      occurrence of the problem.  It may or may not yield further
      information if dereferenced.
 */

import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { Base7807Error, Base7807Response } from "@umccr/elsa-types/error-types";

export function ErrorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // because we are in an error handler - we obviously have to be very careful about
  // creating our own errors in the error handler!
  // so we start here with a problem response that if nothing else works - will be a valid 500 error
  let problemResponse: Base7807Response = {
    type: "about:blank",
    title: "Internal Server Error",
    status: 500,
  };

  // now we attempt to _safely_ fill into details - assuming that we have no assumptions any data structure
  // we get is valid!
  if (error) {
    request.log.warn(error);

    if (error instanceof Base7807Error) {
      problemResponse = error.toResponse();
    } else {
      // we have known validation errors thrown by the Fastify API infrastructure
      if ((error as any).validation) {
        problemResponse.type = "about:blank";
        problemResponse.title = "Validation Error";
        problemResponse.status = 400;
        problemResponse.detail = error.message;
        problemResponse["validation-errors"] = (error as any).validation;
      } else {
        if (error.message) {
          problemResponse.detail = error.message;
        }
      }
    }
  } else {
    request.log.error(
      "Undefined error object encountered in Fastify error handler - responded with generic 500 error"
    );
  }

  // we can't allow a non-error status to come through this code-path - and if we get one - we have to report this
  // as an internal error
  if (problemResponse.status < 400) {
    problemResponse.type = "about:blank";
    problemResponse.title = "Internal Server Error";
    problemResponse.status = 500;
  }

  reply
    .code(problemResponse.status)
    .type("application/problem+json")
    .send(problemResponse);
}
