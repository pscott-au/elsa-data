import * as edgedb from "edgedb";
import e from "../../dbschema/edgeql-js";
import { container, DependencyContainer } from "tsyringe";
import { RedcapImportApplicationService } from "../../src/business/services/australian-genomics/redcap-import-application-service";
import { AuthenticatedUser } from "../../src/business/authenticated-user";
import { beforeEachCommon } from "./releases.common";
import { registerTypes } from "./setup";
import { AustraliaGenomicsDacRedcap } from "@umccr/elsa-types";
import { UsersService } from "../../src/business/services/users-service";

const edgedbClient = edgedb.createClient();

describe("Redcap Import for AG", () => {
  let allowedDataOwnerUser: AuthenticatedUser;
  let testContainer: DependencyContainer;

  beforeAll(async () => {
    testContainer = await registerTypes();
  });

  beforeEach(async () => {
    testContainer.clearInstances();

    ({ allowedDataOwnerUser } = await beforeEachCommon());
  });

  it("Base case with two new users", async () => {
    const redcapImportService = container.resolve(
      RedcapImportApplicationService
    );
    const usersService = container.resolve(UsersService);

    const app = {
      ...sampleApplication1,
      daf_type_research___hmb: "1",
      // this maps to our 10g dataset
      daf_flagships_rd___nmd: "1",
      // an application from entirely unknown users - Albus as applicant/PI
      daf_applicant_name: "Albus Dumbledore",
      daf_applicant_email: "albus@example.com",
      daf_applicant_institution: "Hogwarts",
      daf_applicant_pi_yn: "1",
      // one other collaborator
      daf_collab_num: "1",
      daf_institution_site1: "Durmstrang",
      daf_contact_site1: "Igor Karkaroff",
      daf_contact_email_site1: "igor@durmstrang.org",
      daf_data_house_site1: "1",
    };

    await redcapImportService.startNewRelease(allowedDataOwnerUser, app);

    await usersService.upsertUserForLogin("asadasdfsf", "Albus Dumbledore");

    const potentialCount = await e
      .count(e.permission.PotentialUser)
      .run(edgedbClient);
    expect(potentialCount).toBe(2);
  });

  it("Base case with existing user mention", async () => {
    // our base scenario makes 3 users but lets confirm that
    const existingUserCount = await e
      .count(e.permission.User)
      .run(edgedbClient);
    expect(existingUserCount).toBe(3);

    const redcapImportService = container.resolve(
      RedcapImportApplicationService
    );

    const app = {
      ...sampleApplication1,
      daf_type_research___hmb: "1",
      // this maps to our 10g dataset
      daf_flagships_rd___nmd: "1",
      // the application is from Albus
      daf_applicant_name: "Albus Dumbledore",
      daf_applicant_email: "albus@example.com",
      daf_applicant_institution: "Hogwarts",
      daf_applicant_pi_yn: "0",
      // but we have an explicit PI - that we know!
      daf_pi_name: "Test User Who Isn't Allowed Any Access",
      daf_pi_email: "test@example.com",
      daf_pi_institution: "Made Up",
      daf_pi_institution_same: "0",
      // one other collaborator (who is unknown)
      daf_collab_num: "1",
      daf_institution_site1: "Durmstrang",
      daf_contact_site1: "Igor Karkaroff",
      daf_contact_email_site1: "igor@durmstrang.org",
      daf_data_house_site1: "1",
    };

    await redcapImportService.startNewRelease(allowedDataOwnerUser, app);

    const potentialCount = await e
      .count(e.permission.PotentialUser)
      .run(edgedbClient);
    expect(potentialCount).toBe(1);

    const userCount = await e.count(e.permission.User).run(edgedbClient);
    expect(userCount).toBe(3);
  });
});

const sampleApplication1 = {
  daf_num: "SAMPLE1",
  application_date_hid: "1/1/2022",
  daf_hrec_approve: "1",
  daf_ethics_letter: "file.pdf",
  daf_hrec_num: "123456",
  daf_hrec_approve_dt: "1/1/2022",
  daf_project_title: "Test Project 1",
  daf_public_summ: "Project summarising",
  daf_type_research___method_dev: "0",
  daf_type_research___case_ctrl: "0",
  daf_type_research___popn_stud: "0",
  daf_type_research___hmb: "0",
  daf_type_research___poa: "0",
  daf_type_research___disease: "0",
  daf_type_research___other: "0",
  daf_flagships___cancer: "0",
  daf_flagships___rare: "0",
  daf_flagships___genpop: "0",
  daf_flagships_rd___ac: "0",
  daf_flagships_rd___bm: "0",
  daf_flagships_rd___cardio: "0",
  daf_flagships_rd___ee: "0",
  daf_flagships_rd___hidden: "0",
  daf_flagships_rd___gi: "0",
  daf_flagships_rd___id: "0",
  daf_flagships_rd___lung: "0",
  daf_flagships_rd___renal: "0",
  daf_flagships_rd___leuko: "0",
  daf_flagships_rd___mito: "0",
  daf_flagships_rd___nmd: "0",
  daf_applicant_title: "",
  daf_applicant_name: "",
  daf_applicant_institution: "",
  daf_applicant_email: "",
  daf_applicant_pi_yn: "0",
  daf_pi_name: "",
  daf_pi_institution_same: "",
  daf_pi_institution: "",
  daf_pi_email: "",
  daf_collab_num: "",
  daf_institution_site1: "",
  daf_contact_site1: "",
  daf_contact_email_site1: "",
  daf_data_house_site1: "",
  daf_institution_site2: "",
  daf_contact_site2: "",
  daf_contact_email_site2: "",
  daf_data_house_site2: "",
  daf_institution_site3: "",
  daf_contact_site3: "",
  daf_contact_email_site3: "",
  daf_data_house_site3: "",
  daf_institution_site4: "",
  daf_contact_site4: "",
  daf_contact_email_site4: "",
  daf_data_house_site4: "",
  daf_institution_site5: "",
  daf_contact_site5: "",
  daf_contact_email_site5: "",
  daf_data_house_site5: "",
  // ... all the way to 15 - but not necessary for our tests
} as AustraliaGenomicsDacRedcap;