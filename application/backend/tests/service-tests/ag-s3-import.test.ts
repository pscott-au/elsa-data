import { S3IndexApplicationService } from "../../src/business/services/australian-genomics/s3-index-import-service";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import * as edgedb from "edgedb";
import e, { dataset, storage } from "../../dbschema/edgeql-js";
import { container, DependencyContainer } from "tsyringe";
import { mockClient } from "aws-sdk-client-mock";
import {
  File,
  ArtifactType,
  insertArtifactBamQuery,
} from "../../src/business/db/lab-queries";
import { fileByUrlQuery } from "../../src/business/db/storage-queries";
import { blankTestData } from "../../src/test-data/blank-test-data";
import {
  MOCK_DATASET_URI,
  MOCK_BAM_FILE_SET,
  MOCK_FASTQ_PAIR_FILE_SET,
  MOCK_VCF_FILE_SET,
  MOCK_1_CARDIAC_MANIFEST,
  MOCK_1_CARDIAC_S3_OBJECT_LIST,
  MOCK_1_MANIFEST_OBJECT,
  MOCK_1_S3URL_MANIFEST_OBJECT,
  MOCK_1_CARDIAC_FASTQ1_FILENAME,
  MOCK_1_CARDIAC_FASTQ2_FILENAME,
  MOCK_1_STUDY_ID,
  MOCK_2_STUDY_ID,
  MOCK_2_CARDIAC_S3_OBJECT_LIST,
  MOCK_2_CARDIAC_MANIFEST,
  MOCK_2_BAM_FILE_RECORD,
  MOCK_2_BAI_FILE_RECORD,
  MOCK_3_CARDIAC_S3_OBJECT_LIST,
  MOCK_3_CARDIAC_MANIFEST,
  S3_URL_PREFIX,
} from "./ag.common";
import * as awsHelper from "../../src/business/services/aws-helper";
import {
  getMd5FromChecksumsArray,
  makeSystemlessIdentifierArray,
  makeEmptyIdentifierArray,
} from "../../src/business/db/helper";
import { registerTypes } from "./setup";
import { DatasetService } from "../../src/business/services/dataset-service";

const edgedbClient = edgedb.createClient();
const s3ClientMock = mockClient(S3Client);
let testContainer: DependencyContainer;

describe("AWS s3 client", () => {
  beforeAll(async () => {
    testContainer = await registerTypes();
  });

  beforeEach(async () => {
    s3ClientMock.reset();
    await blankTestData();
  });

  afterEach(async () => {
    await blankTestData();
  });

  it("Test getManifestKeyFromS3ObjectList", async () => {
    const agService = container.resolve(S3IndexApplicationService);
    const manifestObjectList = agService.getManifestUriFromS3ObjectList(
      MOCK_1_CARDIAC_S3_OBJECT_LIST
    );
    expect(manifestObjectList).toEqual([
      "s3://agha-gdr-store-2.0/Cardiac/2019-11-21/manifest.txt",
    ]);
  });

  it("Test convertTsvToJson", async () => {
    const agService = container.resolve(S3IndexApplicationService);
    const jsonManifest = agService.convertTsvToJson(MOCK_1_CARDIAC_MANIFEST);
    expect(jsonManifest).toEqual(MOCK_1_MANIFEST_OBJECT);
  });

  it("Test groupManifestByStudyId", async () => {
    const agService = container.resolve(S3IndexApplicationService);

    const groupArtifactContent = agService.groupManifestByStudyId(
      MOCK_1_S3URL_MANIFEST_OBJECT
    );
    expect(groupArtifactContent["A0000001"]).toEqual(
      MOCK_1_S3URL_MANIFEST_OBJECT
    );
  });

  it("Test groupManifestFileByArtifactTypeAndFilename", async () => {
    const agService = container.resolve(S3IndexApplicationService);

    const fileRecordListedInManifest: File[] = [
      ...MOCK_FASTQ_PAIR_FILE_SET,
      ...MOCK_BAM_FILE_SET,
      ...MOCK_VCF_FILE_SET,
    ];
    const groupArtifactContent =
      agService.groupManifestFileByArtifactTypeAndFilename(
        fileRecordListedInManifest
      );

    expect(
      groupArtifactContent[ArtifactType.FASTQ][
        `${S3_URL_PREFIX}/FILE_L001.fastq`
      ]
    ).toEqual(MOCK_FASTQ_PAIR_FILE_SET);
    expect(
      groupArtifactContent[ArtifactType.BAM][`${S3_URL_PREFIX}/A0000001.bam`]
    ).toEqual(MOCK_BAM_FILE_SET);
    expect(
      groupArtifactContent[ArtifactType.VCF][
        `${S3_URL_PREFIX}/19W001062.individual.norm.vcf`
      ]
    ).toEqual(MOCK_VCF_FILE_SET);
  });

  it("Test updateFileRecordFromManifest", async () => {
    const agService = container.resolve(S3IndexApplicationService);

    const mockInsertUrl = "s3://bucket/FILE_L001_R1.fastq.gz";
    const newManifestContent = {
      checksums: [
        {
          type: storage.ChecksumType.MD5,
          value: "UPDATED_CHECKSUM",
        },
      ],
      url: mockInsertUrl,
      size: 0,
    };

    // Startup
    const insertQuery = e.insert(e.storage.File, {
      url: mockInsertUrl,
      size: 0,
      checksums: [
        {
          type: storage.ChecksumType.MD5,
          value: "OLD_CHECKSUM",
        },
        {
          type: storage.ChecksumType.AWS_ETAG,
          value: "AWS_ETAG",
        },
      ],
    });
    await insertQuery.run(edgedbClient);

    await agService.updateFileRecordFromManifest(newManifestContent);

    // Query For the New Change
    const newFileRec = await fileByUrlQuery.run(edgedbClient, {
      url: mockInsertUrl,
    });

    const newMd5Checksum = getMd5FromChecksumsArray(
      newFileRec?.checksums ?? []
    );
    expect(newMd5Checksum).toEqual("UPDATED_CHECKSUM");
  });

  it("Test updateUnavailableFileRecord", async () => {
    const agService = container.resolve(S3IndexApplicationService);

    const mockInsertUrl = "s3://bucket/FILE_L001_R1.fastq.gz";

    // Startup
    const insertQuery = e.insert(e.storage.File, {
      url: mockInsertUrl,
      size: 0,
      checksums: [
        {
          type: storage.ChecksumType.MD5,
          value: "OLD_CHECKSUM",
        },
      ],
      isDeleted: false,
    });
    await insertQuery.run(edgedbClient);

    await agService.updateUnavailableFileRecord(mockInsertUrl);

    // Query For the New Change
    const newFileRec = await fileByUrlQuery.run(edgedbClient, {
      url: mockInsertUrl,
    });

    const newIsAvailable = newFileRec?.isDeleted;
    expect(newIsAvailable).toEqual(true);
  });

  it("Test insertNewArtifact", async () => {
    const agService = container.resolve(S3IndexApplicationService);
    const dataToInsert = {
      FASTQ: { FQFILENAMEID: MOCK_FASTQ_PAIR_FILE_SET },
      BAM: { BAMFILENAMEID: MOCK_BAM_FILE_SET },
      VCF: { VCFFILENAMEID: MOCK_VCF_FILE_SET },
    };

    const insArtifactQueryList =
      agService.insertNewArtifactListQuery(dataToInsert);

    for (const insQuery of insArtifactQueryList) {
      await insQuery.run(edgedbClient);
    }

    const artifactBaseList = await e
      .select(e.lab.ArtifactBase, () => ({
        id: true,
      }))
      .run(edgedbClient);
    expect(artifactBaseList.length).toEqual(3);

    const fileList = await e
      .select(e.storage.File, () => ({
        id: true,
      }))
      .run(edgedbClient);
    expect(fileList.length).toEqual(6);
  });

  it("Test converts3ManifestTypeToFileRecord", async () => {
    const agService = container.resolve(S3IndexApplicationService);

    const newFileRec = agService.converts3ManifestTypeToFileRecord(
      MOCK_1_S3URL_MANIFEST_OBJECT,
      MOCK_1_CARDIAC_S3_OBJECT_LIST
    );

    expect(newFileRec[0].size).toBeGreaterThanOrEqual(0);
  });

  it("Test linkPedigreeRelationship", async () => {
    const DATA_CASE_ID = "FAM0001";
    const agService = container.resolve(S3IndexApplicationService);

    // Mock Data
    const pedigreeIdList = [
      {
        probandId: "A000001",
        patientId: "A000001",
        datasetCaseId: DATA_CASE_ID,
      },
      {
        probandId: "A000001",
        patientId: "A000001_pat",
        datasetCaseId: DATA_CASE_ID,
      },
      {
        probandId: "A000001",
        patientId: "A000001_mat",
        datasetCaseId: DATA_CASE_ID,
      },
    ];

    // Pre-insert DatasetPatient
    for (const pedigreeId of pedigreeIdList) {
      const { patientId } = pedigreeId;
      const dpQuery = e.insert(e.dataset.DatasetPatient, {
        externalIdentifiers: makeSystemlessIdentifierArray(patientId),
      });
      await dpQuery.run(edgedbClient);
    }

    // Pre-insert DataCaseId
    const insertDatasetCaseQuery = e.insert(e.dataset.DatasetCase, {
      externalIdentifiers: makeSystemlessIdentifierArray(DATA_CASE_ID),
    });
    await insertDatasetCaseQuery.run(edgedbClient);
    await agService.linkPedigreeRelationship(pedigreeIdList);

    const pedigreeQuery = e.select(e.pedigree.Pedigree, () => ({}));
    const pedigreeArray = await pedigreeQuery.run(edgedbClient);
    expect(pedigreeArray.length).toEqual(1);

    const pedigreeRQuery = e.select(
      e.pedigree.PedigreeRelationship,
      () => ({})
    );
    const pedigreeRelationshipArray = await pedigreeRQuery.run(edgedbClient);
    expect(pedigreeRelationshipArray.length).toEqual(2);
  });

  it("Test MOCK 1 insert new Cardiac from s3Key", async () => {
    const agService = container.resolve(S3IndexApplicationService);
    const datasetService = container.resolve(DatasetService);
    await datasetService.selectOrInsertDataset({
      datasetUri: MOCK_DATASET_URI,
      datasetName: "Cardiac",
      datasetDescription: "A test flagship",
    });
    jest
      .spyOn(awsHelper, "awsListObjects")
      .mockImplementation(async () => MOCK_1_CARDIAC_S3_OBJECT_LIST);
    jest
      .spyOn(awsHelper, "readObjectToStringFromS3Url")
      .mockImplementation(async () => MOCK_1_CARDIAC_MANIFEST);

    await agService.syncDbFromDatasetUri(MOCK_DATASET_URI);

    // FILE schema expected values
    const totalFileList = await e
      .select(e.storage.File, () => ({
        url: true,
      }))
      .run(edgedbClient);
    expect(totalFileList.length).toEqual(2);
    const expected = [
      {
        url: `${S3_URL_PREFIX}/${MOCK_1_CARDIAC_FASTQ1_FILENAME}`,
      },
      {
        url: `${S3_URL_PREFIX}/${MOCK_1_CARDIAC_FASTQ2_FILENAME}`,
      },
    ];
    expect(totalFileList).toEqual(expect.arrayContaining(expected));

    const totalDatasetPatient = await e
      .select(e.dataset.DatasetPatient, () => ({
        externalIdentifiers: true,
      }))
      .run(edgedbClient);
    expect(totalDatasetPatient.length).toEqual(1);
    expect(totalDatasetPatient).toEqual([
      { externalIdentifiers: [{ system: "", value: MOCK_1_STUDY_ID }] },
    ]);
  });

  it("Test MOCK 2 Updating Checksum", async () => {
    const agService = container.resolve(S3IndexApplicationService);
    const datasetService = container.resolve(DatasetService);
    await datasetService.selectOrInsertDataset({
      datasetUri: MOCK_DATASET_URI,
      datasetName: "Cardiac",
      datasetDescription: "A test Flagship",
    });
    // Current DB already exist with outdated data
    const bamInsertArtifact = insertArtifactBamQuery(
      MOCK_2_BAM_FILE_RECORD,
      MOCK_2_BAI_FILE_RECORD
    );
    const preExistingData = e.insert(e.dataset.DatasetPatient, {
      externalIdentifiers: makeSystemlessIdentifierArray(MOCK_2_STUDY_ID),
      specimens: e.set(
        e.insert(e.dataset.DatasetSpecimen, {
          externalIdentifiers: makeEmptyIdentifierArray(),
          artifacts: e.set(bamInsertArtifact),
        })
      ),
    });
    const linkDatapatientQuery = e.update(
      e.dataset.DatasetCase,
      (datasetCase) => ({
        set: {
          patients: {
            "+=": preExistingData,
          },
        },
        filter: e.op(datasetCase.dataset.uri, "ilike", MOCK_DATASET_URI),
      })
    );
    await linkDatapatientQuery.run(edgedbClient);

    // MOCK data from S3
    jest
      .spyOn(awsHelper, "awsListObjects")
      .mockImplementation(async () => MOCK_2_CARDIAC_S3_OBJECT_LIST);
    jest
      .spyOn(awsHelper, "readObjectToStringFromS3Url")
      .mockImplementation(async () => MOCK_2_CARDIAC_MANIFEST);

    await agService.syncDbFromDatasetUri(MOCK_DATASET_URI);

    // FILE schema expected values
    const totalFileList = await e
      .select(e.storage.File, () => ({
        url: true,
        checksums: true,
      }))
      .run(edgedbClient);

    expect(totalFileList.length).toEqual(2);
    const expected = [
      {
        url: "s3://agha-gdr-store-2.0/Cardiac/2022-02-22/A0000002.bam",
        checksums: [{ type: "MD5", value: "UPDATED_CHECKSUM" }],
      },
      {
        url: "s3://agha-gdr-store-2.0/Cardiac/2022-02-22/A0000002.bam.bai",
        checksums: [{ type: "MD5", value: "UPDATED_CHECKSUM" }],
      },
    ];
    expect(totalFileList).toEqual(expect.arrayContaining(expected));
  });

  it("Test MOCK 3 Check file mark unavailable", async () => {
    const agService = container.resolve(S3IndexApplicationService);
    const datasetService = container.resolve(DatasetService);
    await datasetService.selectOrInsertDataset({
      datasetUri: MOCK_DATASET_URI,
      datasetName: "Cardiac",
      datasetDescription: "A test Flagship",
    });
    // Current DB already exist with outdated data
    const bamInsertArtifact = insertArtifactBamQuery(
      MOCK_2_BAM_FILE_RECORD,
      MOCK_2_BAI_FILE_RECORD
    );

    const preExistingData = e.insert(e.dataset.DatasetPatient, {
      externalIdentifiers: makeSystemlessIdentifierArray(MOCK_2_STUDY_ID),
      specimens: e.set(
        e.insert(e.dataset.DatasetSpecimen, {
          externalIdentifiers: makeEmptyIdentifierArray(),
          artifacts: e.set(bamInsertArtifact),
        })
      ),
    });
    const linkDatasetUriQuery = e.update(e.dataset.Dataset, (d) => ({
      set: {
        cases: {
          "+=": e.insert(e.dataset.DatasetCase, {
            patients: e.set(preExistingData),
          }),
        },
      },
      filter: e.op(d.uri, "ilike", MOCK_DATASET_URI),
    }));

    await linkDatasetUriQuery.run(edgedbClient);

    // MOCK data from S3
    jest
      .spyOn(awsHelper, "awsListObjects")
      .mockImplementation(async () => MOCK_3_CARDIAC_S3_OBJECT_LIST);
    jest
      .spyOn(awsHelper, "readObjectToStringFromS3Url")
      .mockImplementation(async () => MOCK_3_CARDIAC_MANIFEST);

    await agService.syncDbFromDatasetUri(MOCK_DATASET_URI);

    const expectedFileMarked = [
      "s3://agha-gdr-store-2.0/Cardiac/2022-02-22/A0000002.bam",
      "s3://agha-gdr-store-2.0/Cardiac/2022-02-22/A0000002.bam.bai",
    ];

    for (const e of expectedFileMarked) {
      // Query For the New Change
      const newFileRec = await fileByUrlQuery.run(edgedbClient, {
        url: e,
      });

      const newIsDeleted = newFileRec?.isDeleted;
      expect(newIsDeleted).toEqual(true);
    }
  });
});