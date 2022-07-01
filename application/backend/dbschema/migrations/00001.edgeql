CREATE MIGRATION m1jlbllidb5lrklnrcofp4ypqiuiuf47uwitaeosd4q3lfktl6mpjq
    ONTO initial
{
  CREATE MODULE consent IF NOT EXISTS;
  CREATE MODULE dataset IF NOT EXISTS;
  CREATE MODULE job IF NOT EXISTS;
  CREATE MODULE lab IF NOT EXISTS;
  CREATE MODULE pedigree IF NOT EXISTS;
  CREATE MODULE permission IF NOT EXISTS;
  CREATE MODULE release IF NOT EXISTS;
  CREATE MODULE storage IF NOT EXISTS;
  CREATE SCALAR TYPE release::ApplicationCodedStudyType EXTENDING enum<GRU, HMB, CC, POA, DS>;
  CREATE TYPE release::ApplicationCoded {
      CREATE REQUIRED PROPERTY countriesInvolved -> array<tuple<system: std::str, code: std::str>>;
      CREATE REQUIRED PROPERTY diseasesOfStudy -> array<tuple<system: std::str, code: std::str>>;
      CREATE REQUIRED PROPERTY institutesInvolved -> array<tuple<system: std::str, code: std::str>>;
      CREATE REQUIRED PROPERTY studyAgreesToPublish -> std::bool;
      CREATE REQUIRED PROPERTY studyIsNotCommercial -> std::bool;
      CREATE REQUIRED PROPERTY studyType -> release::ApplicationCodedStudyType;
  };
  CREATE ABSTRACT TYPE consent::ConsentStatement;
  CREATE TYPE consent::Consent {
      CREATE MULTI LINK statements -> consent::ConsentStatement {
          ON TARGET DELETE  ALLOW;
          CREATE CONSTRAINT std::exclusive;
      };
  };
  CREATE ABSTRACT TYPE dataset::DatasetIdentifiable {
      CREATE PROPERTY externalIdentifiers -> array<tuple<system: std::str, value: std::str>>;
  };
  CREATE ABSTRACT TYPE dataset::DatasetShareable {
      CREATE LINK consent -> consent::Consent;
  };
  CREATE TYPE dataset::Dataset EXTENDING dataset::DatasetShareable, dataset::DatasetIdentifiable {
      CREATE OPTIONAL LINK previous -> dataset::Dataset;
      CREATE REQUIRED PROPERTY description -> std::str;
      CREATE REQUIRED PROPERTY uri -> std::str {
          SET readonly := true;
      };
  };
  CREATE TYPE dataset::DatasetCase EXTENDING dataset::DatasetShareable, dataset::DatasetIdentifiable;
  ALTER TYPE dataset::Dataset {
      CREATE MULTI LINK cases -> dataset::DatasetCase {
          ON TARGET DELETE  ALLOW;
          CREATE CONSTRAINT std::exclusive;
      };
  };
  CREATE ABSTRACT TYPE lab::ArtifactBase;
  CREATE TYPE dataset::DatasetSpecimen EXTENDING dataset::DatasetShareable, dataset::DatasetIdentifiable {
      CREATE MULTI LINK artifacts -> lab::ArtifactBase;
      CREATE OPTIONAL PROPERTY sampleType -> std::str;
  };
  CREATE SCALAR TYPE dataset::SexAtBirthType EXTENDING enum<male, female, other>;
  CREATE TYPE dataset::DatasetPatient EXTENDING dataset::DatasetShareable, dataset::DatasetIdentifiable {
      CREATE MULTI LINK specimens -> dataset::DatasetSpecimen {
          ON TARGET DELETE  ALLOW;
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE OPTIONAL PROPERTY sexAtBirth -> dataset::SexAtBirthType;
  };
  CREATE SCALAR TYPE storage::ChecksumType EXTENDING enum<MD5, AWS_ETAG, SHA_1, SHA_256>;
  CREATE TYPE storage::File {
      CREATE REQUIRED PROPERTY checksums -> array<tuple<type: storage::ChecksumType, value: std::str>>;
      CREATE REQUIRED PROPERTY size -> std::int64;
      CREATE REQUIRED PROPERTY url -> std::str;
  };
  CREATE ABSTRACT TYPE release::ReleaseShareable {
      CREATE LINK consent -> consent::Consent;
  };
  CREATE TYPE consent::ConsentStatementDuo EXTENDING consent::ConsentStatement {
      CREATE REQUIRED PROPERTY dataUseLimitation -> std::json;
  };
  ALTER TYPE dataset::DatasetCase {
      CREATE LINK dataset := (.<cases[IS dataset::Dataset]);
      CREATE MULTI LINK patients -> dataset::DatasetPatient {
          ON TARGET DELETE  ALLOW;
          CREATE CONSTRAINT std::exclusive;
      };
  };
  ALTER TYPE dataset::DatasetPatient {
      CREATE LINK dataset := (.<patients[IS dataset::DatasetCase].<cases[IS dataset::Dataset]);
  };
  ALTER TYPE dataset::DatasetSpecimen {
      CREATE LINK dataset := (.<specimens[IS dataset::DatasetPatient].<patients[IS dataset::DatasetCase].<cases[IS dataset::Dataset]);
      CREATE LINK case_ := (.<specimens[IS dataset::DatasetPatient].<patients[IS dataset::DatasetCase]);
      CREATE LINK patient := (.<specimens[IS dataset::DatasetPatient]);
  };
  CREATE SCALAR TYPE job::JobStatus EXTENDING enum<running, failed, completed>;
  CREATE ABSTRACT TYPE job::Job {
      CREATE REQUIRED PROPERTY messages -> array<std::str>;
      CREATE REQUIRED PROPERTY status -> job::JobStatus;
  };
  CREATE TYPE release::Release {
      CREATE MULTI LINK manualExclusions -> dataset::DatasetShareable {
          CREATE PROPERTY reason -> std::str;
          CREATE PROPERTY recorded -> std::str;
          CREATE PROPERTY who -> std::str;
      };
      CREATE MULTI LINK selectedSpecimens -> dataset::DatasetSpecimen {
          ON TARGET DELETE  ALLOW;
      };
      CREATE OPTIONAL LINK runningJob -> job::Job {
          ON TARGET DELETE  ALLOW;
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE REQUIRED LINK applicationCoded -> release::ApplicationCoded;
      CREATE PROPERTY applicationDacDetails -> std::str;
      CREATE PROPERTY applicationDacIdentifier -> std::str;
      CREATE PROPERTY applicationDacTitle -> std::str;
      CREATE REQUIRED PROPERTY created -> std::datetime {
          SET default := (std::datetime_current());
          SET readonly := true;
      };
      CREATE REQUIRED PROPERTY datasetUris -> array<std::str>;
      CREATE PROPERTY releaseEnded -> std::datetime;
      CREATE PROPERTY releaseIdentifier -> std::str;
      CREATE PROPERTY releaseStarted -> std::datetime;
  };
  CREATE TYPE permission::User {
      CREATE MULTI LINK datasetOwner -> dataset::Dataset {
          ON TARGET DELETE  ALLOW;
      };
      CREATE MULTI LINK releaseParticipant -> release::Release {
          ON TARGET DELETE  ALLOW;
          CREATE PROPERTY role -> std::str {
              CREATE CONSTRAINT std::one_of('DataOwner', 'Member', 'PI');
          };
      };
      CREATE PROPERTY displayName -> std::str;
      CREATE REQUIRED PROPERTY subjectId -> std::str {
          SET readonly := true;
          CREATE CONSTRAINT std::exclusive;
          CREATE CONSTRAINT std::min_len_value(6);
      };
  };
  CREATE SCALAR TYPE pedigree::KinType EXTENDING enum<isRelativeOf, isBiologicalRelativeOf, isBiologicalParentOf, isSpermDonorOf, isBiologicalSiblingOf, isFullSiblingOf, isMultipleBirthSiblingOf, isParentalSiblingOf, isHalfSiblingOf, isMaternalCousinOf, isPaternalCousinOf>;
  CREATE TYPE pedigree::PedigreeRelationship {
      CREATE REQUIRED LINK individual -> dataset::DatasetPatient;
      CREATE REQUIRED LINK relative -> dataset::DatasetPatient;
      CREATE REQUIRED PROPERTY relation -> pedigree::KinType;
  };
  CREATE TYPE pedigree::Pedigree {
      CREATE LINK proband -> dataset::DatasetPatient;
      CREATE MULTI LINK relationships -> pedigree::PedigreeRelationship {
          ON TARGET DELETE  ALLOW;
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE OPTIONAL PROPERTY reason -> tuple<system: std::str, value: std::str>;
  };
  ALTER TYPE dataset::DatasetCase {
      CREATE OPTIONAL LINK pedigree := (pedigree::Pedigree);
  };
  CREATE TYPE job::SelectJob EXTENDING job::Job {
      CREATE MULTI LINK todoQueue -> dataset::DatasetCase {
          ON TARGET DELETE  ALLOW;
      };
      CREATE MULTI LINK selectedSpecimens -> dataset::DatasetSpecimen {
          ON TARGET DELETE  ALLOW;
      };
  };
  CREATE TYPE lab::Analyses {
      CREATE MULTI LINK input -> lab::ArtifactBase;
      CREATE MULTI LINK output -> lab::ArtifactBase {
          ON TARGET DELETE  ALLOW;
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY analysesDate -> std::datetime;
      CREATE PROPERTY pipeline -> std::str;
  };
  CREATE TYPE lab::ArtifactBam EXTENDING lab::ArtifactBase {
      CREATE REQUIRED LINK baiFile -> storage::File;
      CREATE REQUIRED LINK bamFile -> storage::File;
  };
  CREATE TYPE lab::ArtifactBcl EXTENDING lab::ArtifactBase {
      CREATE REQUIRED LINK bclFile -> storage::File;
  };
  CREATE TYPE lab::ArtifactCram EXTENDING lab::ArtifactBase {
      CREATE REQUIRED LINK craiFile -> storage::File;
      CREATE REQUIRED LINK cramFile -> storage::File;
  };
  CREATE TYPE lab::ArtifactFastqPair EXTENDING lab::ArtifactBase {
      CREATE REQUIRED LINK forwardFile -> storage::File;
      CREATE REQUIRED LINK reverseFile -> storage::File;
  };
  CREATE TYPE lab::ArtifactVcf EXTENDING lab::ArtifactBase {
      CREATE REQUIRED LINK tbiFile -> storage::File;
      CREATE REQUIRED LINK vcfFile -> storage::File;
  };
  CREATE TYPE lab::SubmissionBatch {
      CREATE MULTI LINK artifactsIncluded -> lab::ArtifactBase {
          ON TARGET DELETE  ALLOW;
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY externalIdentifier -> std::str;
  };
  CREATE TYPE lab::Run {
      CREATE MULTI LINK artifactsProduced -> lab::ArtifactBase {
          ON TARGET DELETE  ALLOW;
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY platform -> std::str;
      CREATE PROPERTY runDate -> std::datetime;
  };
  CREATE TYPE release::AuditEvent {
      CREATE REQUIRED PROPERTY occurredDateTime -> std::datetime;
      CREATE PROPERTY occurredDuration -> std::duration;
      CREATE REQUIRED PROPERTY recordedDateTime -> std::datetime {
          SET default := (std::datetime_current());
          SET readonly := true;
      };
      CREATE PROPERTY what -> std::str;
  };
};
