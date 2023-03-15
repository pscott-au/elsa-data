import { Client, createClient } from "edgedb";
import e from "../../dbschema/edgeql-js";
import { blankTestData } from "../../src/test-data/blank-test-data";
import {
  insertRelease2,
  RELEASE2_APPLICATION_DAC_TITLE,
  RELEASE2_RELEASE_IDENTIFIER,
} from "../../src/test-data/insert-test-data-release2";
import { insertRelease4 } from "../../src/test-data/insert-test-data-release4";
import { insertRelease3 } from "../../src/test-data/insert-test-data-release3";
import { UsersService } from "../../src/business/services/users-service";
import { releaseGetAllByUser } from "../../dbschema/queries";

describe("edgedb release queries tests", () => {
  let edgeDbClient: Client;
  let release1: { id: string };
  let release2: { id: string };
  let release3: { id: string };
  let release4: { id: string };

  beforeAll(async () => {
    edgeDbClient = createClient({});
  });

  afterAll(() => {});

  beforeEach(async () => {
    await blankTestData();
    // release1 = await insertRelease1(); release 1 has a dependence on Settings (which we should fix) - so not
    // suitable at the raw db level
    release2 = await insertRelease2();
    release3 = await insertRelease3();
    release4 = await insertRelease4();
  });

  async function createTestUser() {
    return await e
      .insert(e.permission.User, {
        subjectId: "asubjectid",
        displayName: "A Display Name",
        email: "an@email.com",
      })
      .run(edgeDbClient);
  }

  it("get all on releases returns correct roles and fields", async () => {
    const testUserInsert = await createTestUser();

    await UsersService.addUserToReleaseWithRole(
      edgeDbClient,
      release2.id,
      testUserInsert.id,
      "Manager",
      "id1",
      "name1"
    );

    await UsersService.addUserToReleaseWithRole(
      edgeDbClient,
      release3.id,
      testUserInsert.id,
      "Administrator",
      "id2",
      "name2"
    );

    // and we don't add them into release 4 at all

    const result = await releaseGetAllByUser(edgeDbClient, {
      userDbId: testUserInsert.id,
      limit: 100,
      offset: 0,
    });

    expect(result).not.toBeNull();
    expect(result!.data.length).toBe(2);

    {
      const a = result!.data[0];

      expect(a.releaseKey).toBe("R003");
      expect(a.applicationDacTitle).toBe("An Invisible Study");
      expect(a.role).toBe("Administrator");
    }

    {
      const b = result!.data[1];

      expect(b.releaseKey).toBe(RELEASE2_RELEASE_IDENTIFIER);
      expect(b.applicationDacTitle).toBe(RELEASE2_APPLICATION_DAC_TITLE);
      expect(b.role).toBe("Manager");
    }
  });

  it("get all on releases returns nothing if noone involved", async () => {
    const testUserInsert = await createTestUser();

    const result = await releaseGetAllByUser(edgeDbClient, {
      userDbId: testUserInsert.id,
      limit: 100,
      offset: 0,
    });

    expect(result).not.toBeNull();
    expect(result!.data.length).toBe(0);
    expect(result!.total).toBe(0);
  });

  it("get all on releases does basic paging", async () => {
    const testUserInsert = await createTestUser();

    await UsersService.addUserToReleaseWithRole(
      edgeDbClient,
      release2.id,
      testUserInsert.id,
      "Manager",
      "id1",
      "name1"
    );

    await UsersService.addUserToReleaseWithRole(
      edgeDbClient,
      release3.id,
      testUserInsert.id,
      "Administrator",
      "id2",
      "name2"
    );

    await UsersService.addUserToReleaseWithRole(
      edgeDbClient,
      release4.id,
      testUserInsert.id,
      "Member",
      "id3",
      "name3"
    );

    {
      const result1 = await releaseGetAllByUser(edgeDbClient, {
        userDbId: testUserInsert.id,
        limit: 1,
        offset: 1,
      });

      expect(result1).not.toBeNull();
      expect(result1!.data.length).toBe(1);
      expect(result1!.data[0].releaseKey).toBe("R003");
      expect(result1!.total).toBe(3);
    }

    {
      const result2 = await releaseGetAllByUser(edgeDbClient, {
        userDbId: testUserInsert.id,
        limit: 1,
        offset: 0,
      });

      expect(result2).not.toBeNull();
      expect(result2!.data.length).toBe(1);
      expect(result2!.data[0].releaseKey).toBe("R004");
      expect(result2!.total).toBe(3);
    }
  });
});
