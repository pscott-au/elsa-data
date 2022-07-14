import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDna,
  faFemale,
  faMale,
  faQuestion,
} from "@fortawesome/free-solid-svg-icons";

import { ReleasePatientType } from "@umccr/elsa-types";
import axios from "axios";
import { useQueryClient } from "react-query";
import classNames from "classnames";

type Props = {
  releaseId: string;
  patients: ReleasePatientType[];
  showCheckboxes: boolean;
};

export const PatientsFlexRow: React.FC<Props> = ({
  releaseId,
  patients,
  showCheckboxes,
}) => {
  const queryClient = useQueryClient();

  const onSelectChange = async (id: string) => {
    await axios.post<any>(`/api/releases/${releaseId}/specimens/select`, [id]);
    await queryClient.invalidateQueries();
  };

  const onUnselectChange = async (id: string) => {
    await axios.post<any>(`/api/releases/${releaseId}/specimens/unselect`, [
      id,
    ]);
    await queryClient.invalidateQueries();
  };

  const patientDiv = (patient: ReleasePatientType) => {
    let patientIcon = <FontAwesomeIcon icon={faQuestion} />;
    let patientClasses = [
      "p-2",
      "border",
      "border-gray-400",
      "flex",
      "flex-col",
      "lg:flex-row",
      "lg:justify-between",
    ];

    if (patient.sexAtBirth === "male") {
      patientIcon = <FontAwesomeIcon icon={faMale} />;
    }
    if (patient.sexAtBirth === "female") {
      patientIcon = <FontAwesomeIcon icon={faFemale} />;
      patientClasses.push("rounded-xl");
    }

    return (
      <div className={classNames(...patientClasses)}>
        <span>
          {patientIcon} {patient.externalId}
        </span>
        <ul key={patient.id}>
          {patient.specimens.map((spec) => (
            <li key={spec.id} className="text-left lg:text-right">
              <FontAwesomeIcon icon={faDna} />{" "}
              {showCheckboxes && (
                <label>
                  {spec.externalId}
                  <input
                    type="checkbox"
                    className="ml-2"
                    checked={spec.nodeStatus == "selected"}
                    onChange={async (ce) =>
                      ce.target.checked
                        ? await onSelectChange(spec.id)
                        : await onUnselectChange(spec.id)
                    }
                  />
                </label>
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
    <div className="grid grid-flow-row-dense grid-cols-3 gap-2">
      {patients.map((pat, index) => patientDiv(pat))}
    </div>
  );
};
