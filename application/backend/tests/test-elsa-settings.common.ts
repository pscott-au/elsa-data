import { ElsaSettings } from "../src/config/elsa-settings";
import { Issuer } from "openid-client";

// even though our elsa settings are a factory - we don't want to have to do this work every
// time as it has to go to the internet and discover the CIlogon OIDC settings
const ciLogonIssuer = new Issuer({
  issuer: "https://cilogon.org",
});

/**
 * A settings object that is suitable for use throughout our test
 * suite.
 */
export const createTestElsaSettings: () => ElsaSettings = () => ({
  // TODO these settings have just been thrown in - and may need to be refined as testing gets
  //      more sophisticated
  port: 3000,
  deployedUrl: "http://localhost:3000",
  datasets: [
    {
      name: "10G",
      description: "UMCCR 10G",
      uri: "urn:fdc:umccr.org:2022:dataset/10g",
      storageLocation: "aws-s3",
      storageUriPrefix: "s3://umccr-10g-data-dev",
    },
    {
      name: "10F",
      description: "UMCCR 10F",
      uri: "urn:fdc:umccr.org:2022:dataset/10f",
      storageLocation: "aws-s3",
      storageUriPrefix: "s3://umccr-10f-data-dev",
    },
    {
      name: "10C",
      description: "UMCCR 10C",
      uri: "urn:fdc:umccr.org:2022:dataset/10c",
      storageLocation: "aws-s3",
      storageUriPrefix: "s3://umccr-10c-data-dev",
    },
  ],
  superAdmins: [],
  remsUrl: "https://hgpp-rems.dev.umccr.org",
  remsBotKey: "a",
  remsBotUser: "b",
  oidcClientId: "",
  oidcClientSecret: "",
  oidcIssuer: ciLogonIssuer,
  sessionSalt: "ABCD",
  sessionSecret: "XYZ",
  ontoFhirUrl: "",
  awsSigningSecretAccessKey: "A",
  awsSigningAccessKeyId: "B",
  rateLimit: {},
});