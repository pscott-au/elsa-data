import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDna,
  faF,
  faFemale,
  faM,
  faMale,
  faQuestion,
} from "@fortawesome/free-solid-svg-icons";
import { ReleasePatientType } from "@umccr/elsa-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import { ConsentPopup } from "./consent-popup";
import { axiosPatchOperationMutationFn } from "../../queries";
import { ReleaseTypeLocal } from "../../shared-types";
import { faCircle } from "@fortawesome/free-regular-svg-icons";

type Props = {
  releaseKey: string;
  patients: ReleasePatientType[];

  // whether to show checkboxes or not - though we note there are other fields
  // which control whether the checkboxes are enabled or not - this is just whether
  // to display them
  showCheckboxes: boolean;
  onCheckboxClicked?: () => void;

  // when the release is activated we want to display all the information/UI
  // as per normal - but we just don't want to allow any editing
  releaseIsActivated: boolean;

  // whether to show any consent iconography/popups (until the consent feature is fully
  // bedded down we don't want it to appear at all)
  showConsent: boolean;
};

/**
 * The patient flex row is a flex row div that displays all the individuals in
 * a case, including listing their sample ids. It also draws icons to give extra
 * data about the patient/samples in a compact form.
 *
 * @param releaseKey
 * @param patients
 * @param showCheckboxes
 * @param onCheckboxClicked
 * @param releaseIsActivated
 * @param showConsent
 *
 * @constructor
 */
export const PatientsFlexRow: React.FC<Props> = ({
  releaseKey,
  patients,
  showCheckboxes,
  onCheckboxClicked,
  releaseIsActivated,
  showConsent,
}) => {
  const queryClient = useQueryClient();

  // a mutator that can alter any field set up using our REST PATCH mechanism
  // the argument to the mutator needs to be a single ReleasePatchOperationType operation
  const releasePatchMutate = useMutation(
    axiosPatchOperationMutationFn(`/api/releases/${releaseKey}`),
    {
      // we want to trigger the refresh of the entire release page
      // TODO can we optimise this to just invalidate the cases?
      onSuccess: async (result: ReleaseTypeLocal) =>
        await queryClient.invalidateQueries(),
    }
  );

  const onSelectChange = async (
    ce: React.ChangeEvent<HTMLInputElement>,
    id: string
  ) => {
    // our other UI work should mean this event never occurs, but easy
    // to also skip it here
    if (releaseIsActivated) return;

    if (onCheckboxClicked !== undefined) onCheckboxClicked();

    if (ce.target.checked) {
      releasePatchMutate.mutate({
        op: "add",
        path: "/specimens",
        value: [id],
      });
    } else {
      releasePatchMutate.mutate({
        op: "remove",
        path: "/specimens",
        value: [id],
      });
    }
  };

  const patientDiv = (patient: ReleasePatientType) => {
    let patientIcon = <></>;
    let patientClasses = [
      "p-2",
      "border",
      "border-slate-200",
      "flex",
      "flex-col",
      "items-center",
      "lg:flex-row",
      "lg:justify-between",
      "min-w-fit",
    ];

    // the select/unselect operation can be a bit complex on the backend - so we want to give visual feedback
    // as the operation applies
    if (releasePatchMutate.isLoading) patientClasses.push("opacity-50");

    // at these sizes on screen the icons are barely distinguishable but whatever
    if (patient.sexAtBirth === "male") {
      patientIcon = (
        <div className="flex h-5 w-5 items-center justify-center rounded-xl bg-gray-500">
          <span className="text-xs font-bold text-white" title="male">
            M
          </span>
        </div>
      );
    }
    if (patient.sexAtBirth === "female") {
      patientIcon = (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-700">
          <span className="text-xs font-bold text-white" title="female">
            F
          </span>
        </div>
      );
      // as per a pedigree chart - rounded=female
      patientClasses.push("rounded-xl");
    }

    return (
      <div className={classNames(...patientClasses)}>
        <div className="form-control">
          <label className="label space-x-1">
            <span className="label-text">{patient.externalId}</span>
            {patientIcon}
            {showConsent && patient.customConsent && (
              <ConsentPopup releaseKey={releaseKey} nodeId={patient.id} />
            )}
          </label>
        </div>
        <ul key={patient.id}>
          {patient.specimens.map((spec) => (
            <li key={spec.id} className="text-left lg:text-right">
              {showCheckboxes && (
                <div className="form-control">
                  <label className="label cursor-pointer space-x-1">
                    <FontAwesomeIcon icon={faDna} />
                    {showConsent && spec.customConsent && (
                      <>
                        <ConsentPopup
                          releaseKey={releaseKey}
                          nodeId={spec.id}
                        />
                      </>
                    )}
                    <span className="label-text">{spec.externalId}</span>
                    <input
                      disabled={releaseIsActivated}
                      type="checkbox"
                      className="checkbox-accent checkbox checkbox-sm ml-2"
                      checked={spec.nodeStatus == "selected"}
                      onChange={async (ce) => onSelectChange(ce, spec.id)}
                    />
                  </label>
                </div>
              )}
              {!showCheckboxes && <span>{spec.externalId}</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // TODO: possibly chose the number of grid columns based on the number of patients

  return (
    <div className="grid min-w-max grid-flow-row-dense grid-cols-3 gap-2">
      {patients.map((pat, index) => (
        <React.Fragment key={index}>{patientDiv(pat)}</React.Fragment>
      ))}
    </div>
  );
};
