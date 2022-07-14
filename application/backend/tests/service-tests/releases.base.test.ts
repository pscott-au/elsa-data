import { Client, createClient } from "edgedb";
import { releasesService } from "../../src/business/services/releases-service";
import { AuthenticatedUser } from "../../src/business/authenticated-user";
import assert from "assert";
import {
  findCase,
  findDatabaseSpecimenIds,
  findPatient,
  findSpecimen,
} from "./utils";
import LinkHeader from "http-link-header";
import { ReleaseCaseType } from "@umccr/elsa-types";
import { PagedResult } from "../../src/api/api-pagination";
import { releasesAwsService } from "../../src/business/services/aws-base-service";
import { beforeEachCommon } from "./releases.common";

let edgeDbClient: Client;
let testReleaseId: string;

let allowedDataOwnerUser: AuthenticatedUser;
let allowedPiUser: AuthenticatedUser;
let notAllowedUser: AuthenticatedUser;

beforeEach(async () => {
  ({
    edgeDbClient,
    testReleaseId,
    allowedDataOwnerUser,
    allowedPiUser,
    notAllowedUser,
  } = await beforeEachCommon());
});

/**
 *
 */
it("allowed users can get release data", async () => {
  const result = await releasesService.get(allowedPiUser, testReleaseId);

  expect(result).not.toBeNull();
  assert(result != null);
});

/**
 *
 */
it("not allowed users cannot get release data", async () => {
  await expect(async () => {
    const result = await releasesService.get(notAllowedUser, testReleaseId);
  }).rejects.toThrow(Error);
});

it("basic release data is present", async () => {
  const result = await releasesService.get(allowedPiUser, testReleaseId);

  expect(result).not.toBeNull();
  assert(result != null);

  expect(result.applicationDacTitle).toBe("A Study in Many Parts");
  expect(result.runningJob).toBeUndefined();
  expect(result.applicationDacDetails).toBe(
    "So this is all that we have brought over not coded"
  );
});

it("aa", async () => {
  const l = new LinkHeader();

  l.set({ rel: "next", uri: "http://example.com/next" });

  console.log(l.toString());
});

it("bb", async () => {
  await releasesAwsService.getPresigned(allowedPiUser, testReleaseId);
});
