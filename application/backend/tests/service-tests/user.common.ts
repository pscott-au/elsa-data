import { createClient } from "edgedb";
import { blankTestData } from "../../src/test-data/util/blank-test-data";
import e from "../../dbschema/edgeql-js";
import { AuthenticatedUser } from "../../src/business/authenticated-user";
import assert from "node:assert";

/**
 * This is a common beforeEach call that should be used to setup a base
 * test state for all user testing.
 *
 * If you make *any* changes here - you must re-run all the release tests
 * to ensure that the state change hasn't unexpectedly resulted in a test failing.
 */
export async function beforeEachCommon() {
  const edgeDbClient = createClient({});

  await blankTestData();

  const allowedPiSubject = "http://subject1.com";
  const allowedPiDisplayName = "Test User Who Is An Admin";
  const allowedPiEmail = "subject1@elsa.net";

  const allowedManagerUserInsert = await e
    .insert(e.permission.User, {
      subjectId: allowedPiSubject,
      displayName: allowedPiDisplayName,
      email: allowedPiEmail,
      isAllowedRefreshDatasetIndex: true,
      isAllowedCreateRelease: true,
      isAllowedOverallAdministratorView: true,
    })
    .run(edgeDbClient);

  assert(allowedManagerUserInsert);
  assert(allowedManagerUserInsert.id);

  const existingUser = new AuthenticatedUser({
    id: allowedManagerUserInsert.id,
    subjectId: allowedPiSubject,
    displayName: allowedPiDisplayName,
    email: allowedPiEmail,
    isAllowedRefreshDatasetIndex: true,
    isAllowedCreateRelease: true,
    isAllowedOverallAdministratorView: true,
    lastLoginDateTime: new Date(),
  });

  return {
    edgeDbClient,
    existingUser,
  };
}
