import { DuoLimitationCodedType, DuoLimitationSchema } from "@umccr/elsa-types";
import addFormats from "ajv-formats";
import Ajv from "ajv/dist/2019";

const ajv = addFormats(new Ajv({}), [
  "date-time",
  "time",
  "date",
  "email",
  "hostname",
  "ipv4",
  "ipv6",
  "uri",
  "uri-reference",
  "uuid",
  "uri-template",
  "json-pointer",
  "relative-json-pointer",
  "regex",
])
  .addKeyword("kind")
  .addKeyword("modifier");

describe("test basic duo stuff", () => {
  let gruExample: DuoLimitationCodedType;
  let dsExample: DuoLimitationCodedType;
  let hmbExample: DuoLimitationCodedType;
  let hmbExampleBadStart: DuoLimitationCodedType;

  beforeEach(() => {
    // these are checks on the Typescript types that were generated by typebox
    // obviously we can only generate 'correct' structures here for testing - as anything not
    // correct will fail to compile
    gruExample = {
      code: "DUO:0000042",
      modifiers: [
        {
          code: "DUO:0000019",
        },
      ],
    };
    dsExample = {
      code: "DUO:0000007",
      disease: "Placeholder for the moment",
      modifiers: [
        {
          code: "DUO:0000046",
        },
        {
          code: "DUO:0000018",
        },
      ],
    };

    hmbExample = {
      code: "DUO:0000006",
      modifiers: [
        {
          code: "DUO:0000025",
          start: "2020-01-01",
        },
      ],
    };

    // the typescript type system cannot support regex restrictions that are available in JSON schema
    // here is an example were we expect the JSON check of this *will* fail
    hmbExampleBadStart = {
      code: "DUO:0000006",
      modifiers: [
        {
          code: "DUO:0000025",
          start: "2020-01-AB",
        },
      ],
    };
  });

  it("Compile JSON schema", async () => {
    const limitationValidate = ajv.compile(DuoLimitationSchema);

    // if for debug you want to see the schema
    // console.log(JSON.stringify(DuoLimitationSchema, null, 2));
  });

  it("JSON schema testing of the compilable Typescript DUO instances", async () => {
    const limitationValidate = ajv.compile(DuoLimitationSchema);

    // these are literally our 'correct' compilable typescript examples
    // we expect that they will also pass JSON validation

    expect(limitationValidate(gruExample)).toBe(true);
    expect(limitationValidate(dsExample)).toBe(true);
    // throw in an example here of validating ajv *without* the compiled schema
    expect(ajv.validate(DuoLimitationSchema, hmbExample)).toBe(true);

    expect(limitationValidate(hmbExampleBadStart)).toBe(false);
  });

  it("JSON schema testing of mutated Typescript DUO instances", async () => {
    const limitationValidate = ajv.compile(DuoLimitationSchema);

    // we will cause this previous working example to fail changing the code from GRU to DS
    // (where DS instances MUST have a disease property)
    (gruExample as any).code = "DUO:0000007";

    const validated = limitationValidate(gruExample);

    expect(validated).toBe(false);
  });
});
