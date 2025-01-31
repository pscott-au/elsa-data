import React, { ReactNode } from "react";
import classNames from "classnames";
import { useMutation } from "@tanstack/react-query";
import { Box } from "../../../components/boxes";
import { ReleaseTypeLocal } from "../shared-types";
import {
  LeftDiv,
  RhSection,
  RightDiv,
} from "../../../components/rh/rh-structural";
import { RhCheckItem, RhChecks } from "../../../components/rh/rh-checks";
import { axiosPatchOperationMutationFn } from "../queries";
import { trpc } from "../../../helpers/trpc";

type Props = {
  releaseKey: string;
  releaseData: ReleaseTypeLocal;
  isEditable: boolean;
};

export const FurtherRestrictionsBox: React.FC<Props> = ({
  releaseKey,
  releaseData,
  isEditable = false,
}) => {
  const utils = trpc.useContext();

  // a mutator that can alter any field set up using our REST PATCH mechanism
  // the argument to the mutator needs to be a single ReleasePatchOperationType operation
  const releasePatchMutate = useMutation(
    axiosPatchOperationMutationFn(`/api/releases/${releaseKey}`),
    {
      onSuccess: (result: ReleaseTypeLocal) =>
        // we need to cross over into TRPC world to invalidate its cache
        // eventually we should move this PATCH to TRPC too
        utils.releaseRouter.getSpecificRelease.invalidate({
          releaseKey: releaseKey,
        }),
    }
  );

  const isAllowedCheck = (
    label: ReactNode,
    path:
      | "/allowedRead"
      | "/allowedVariant"
      | "/allowedPhenotype"
      | "/allowedS3"
      | "/allowedGS"
      | "/allowedR2"
      | null,
    current: boolean
  ) => (
    <RhCheckItem
      label={label}
      checked={current}
      disabled={!path || !!releaseData.activation}
      className={classNames({ "opacity-50": releasePatchMutate.isLoading })}
      inputClassName={"checkbox-accent"}
      onChange={(e) => {
        if (path) {
          releasePatchMutate.mutate({
            op: "replace",
            path: path,
            value: !current,
          });
        }
      }}
    />
  );

  return (
    <Box heading="Access Control" applyIsLockedStyle={!!releaseData.activation}>
      <RhSection>
        <LeftDiv
          heading={"Data"}
          extra={
            "Access must be granted based on the type and location of the data"
          }
        />
        <RightDiv>
          <div className="flex w-full">
            <div className="grid flex-grow">
              <RhChecks label="By Data Type">
                {isAllowedCheck("Identifiers (always allowed)", null, true)}
                {isAllowedCheck(
                  "Reads (e.g. BAM, CRAM, FASTQ, ORA)",
                  "/allowedRead",
                  releaseData.isAllowedReadData
                )}
                {isAllowedCheck(
                  "Variants (e.g. VCF)",
                  "/allowedVariant",
                  releaseData.isAllowedVariantData
                )}
                {isAllowedCheck(
                  "Phenotypes (e.g. FHIR, Phenopackets) (currently disabled)",
                  null,
                  false
                )}
              </RhChecks>
            </div>
            <div className="divider divider-horizontal"></div>
            <div className="grid flex-grow">
              <RhChecks label="By Data Location">
                {isAllowedCheck(
                  <>
                    AWS S3 (<span className="font-mono">s3://...</span>)
                  </>,
                  "/allowedS3",
                  releaseData.isAllowedS3Data
                )}
                {isAllowedCheck(
                  <>
                    Google GCP (<span className="font-mono">gs://...</span>)
                  </>,
                  "/allowedGS",
                  releaseData.isAllowedGSData
                )}
                {isAllowedCheck(
                  <>
                    CloudFlare R2 (<span className="font-mono">r2://...</span>)
                  </>,
                  "/allowedR2",
                  releaseData.isAllowedR2Data
                )}
              </RhChecks>
            </div>
          </div>
        </RightDiv>
      </RhSection>
    </Box>
  );
};
