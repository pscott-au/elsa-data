import React, { ReactNode, useState } from "react";
import { ReleaseCaseType } from "@umccr/elsa-types";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IndeterminateCheckbox } from "../../../../components/indeterminate-checkbox";
import { PatientsFlexRow } from "./patients-flex-row";
import classNames from "classnames";
import { Box } from "../../../../components/boxes";
import { BoxPaginator } from "../../../../components/box-paginator";
import { isEmpty, trim } from "lodash";
import { ConsentPopup } from "./consent-popup";
import { EagerErrorBoundary } from "../../../../components/errors";
import { handleTotalCountHeaders } from "../../../../helpers/paging-helper";
import { axiosPatchOperationMutationFn } from "../../queries";
import { Table } from "../../../../components/tables";

type Props = {
  releaseKey: string;

  // when the release is activated we want the UI to look approximately
  // as per normal - but with no ability for anyone to edit
  releaseIsActivated: boolean;

  // a map of every dataset uri we will encounter mapped to a single letter
  datasetMap: Map<string, ReactNode>;

  // the (max) number of case items shown on any single page
  pageSize: number;

  // whether the table is being viewed by someone with permissions to edit it
  isEditable: boolean;

  // whether to show any consent iconography/popups
  showConsent: boolean;
};

export const CasesBox: React.FC<Props> = ({
  releaseKey,
  releaseIsActivated,
  datasetMap,
  pageSize,
  isEditable,
  showConsent,
}) => {
  const [isSelectAllIndeterminate, setIsSelectAllIndeterminate] =
    useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // our internal state for which page we are on
  const [currentPage, setCurrentPage] = useState<number>(1);

  // very briefly whilst the first page is downloaded we estimate that we have only one entry
  const [currentTotal, setCurrentTotal] = useState<number>(1);

  const [searchText, setSearchText] = useState("");

  const onSearchTextChange = (text: string) => {
    setIsLoading(true);
    setCurrentPage(1);
    setSearchText(text);
  };

  const makeUseableSearchText = (t: string | undefined) => {
    if (!isEmpty(t) && !isEmpty(trim(t))) return trim(t);
    else return undefined;
  };

  const dataQuery = useQuery(
    ["releases-cases", currentPage, searchText, releaseKey],
    async () => {
      const urlParams = new URLSearchParams();
      const useableSearchText = makeUseableSearchText(searchText);
      if (useableSearchText) {
        urlParams.append("q", useableSearchText);
      }
      urlParams.append("page", currentPage.toString());
      const u = `/api/releases/${releaseKey}/cases?${urlParams.toString()}`;
      return await axios.get<ReleaseCaseType[]>(u).then((response) => {
        handleTotalCountHeaders(response, setCurrentTotal);

        setIsLoading(false);
        return response.data;
      });
    },
    { keepPreviousData: true }
  );

  const queryClient = useQueryClient();

  // a mutator that can alter any field set up using our REST PATCH mechanism
  // the argument to the mutator needs to be a single ReleasePatchOperationType operation
  const releasePatchMutate = useMutation(
    axiosPatchOperationMutationFn(`/api/releases/${releaseKey}`),
    {
      // we want to trigger the refresh of the entire release page
      // TODO can we optimise this to just invalidate the cases?
      onSuccess: async () => await queryClient.invalidateQueries(),
    }
  );

  const onSelectAllChange = async (ce: React.ChangeEvent<HTMLInputElement>) => {
    setIsSelectAllIndeterminate(false);

    if (ce.target.checked) {
      releasePatchMutate.mutate({
        op: "add",
        path: "/specimens",
        value: [],
      });
    } else {
      releasePatchMutate.mutate({
        op: "remove",
        path: "/specimens",
        value: [],
      });
    }
  };

  const rowSpans: number[] = [];

  // this horrible little piece of logic is used to make rowspans where we have a common
  // dataset shared by rows
  // our cases are always ordered by dataset - so that is why this will generally work
  if (dataQuery.isSuccess) {
    let currentDataset = "not a dataset";
    let currentSpanRow = -1;

    for (let r = 0; r < dataQuery.data.length; r++) {
      if (dataQuery.data[r].fromDatasetUri !== currentDataset) {
        // if we have changed from the previous - then its a new span..
        currentSpanRow = r;
        currentDataset = dataQuery.data[r].fromDatasetUri;

        rowSpans.push(1);
      } else {
        // if it's the same as the previous - we want to increase the 'current' and put in a marker to the rowspans
        rowSpans[currentSpanRow] += 1;
        rowSpans.push(-1);
      }
    }
  }

  const baseColumnClasses = "py-4 font-medium text-gray-900 whitespace-nowrap";

  const baseMessageDivClasses =
    "min-h-[10em] w-full flex items-center justify-center";

  // if they cannot edit cases AND the release is not activated then effectively there is nothing
  // they can do yet... so we give them some instructions informing them of that
  if (!releaseIsActivated && !isEditable)
    return (
      <Box heading="Cases">
        <div className="prose max-w-none">
          <p>
            Once a release is created - the data owners and stewards must go
            through a process of setting up the exact set of data which will be
            shared with you.
          </p>
          <p>
            That process is currently not completed - you will receive an email
            informing you when the process is completed at which point you will
            be able to access the data.
          </p>
        </div>
      </Box>
    );

  return (
    <Box heading="Cases" applyIsLockedStyle={releaseIsActivated}>
      <div className={classNames("flex flex-col")}>
        <BoxPaginator
          currentPage={currentPage}
          setPage={(n) => setCurrentPage(n)}
          rowCount={currentTotal}
          rowsPerPage={pageSize}
          rowWord="cases"
          currentSearchText={searchText}
          onSearchTextChange={onSearchTextChange}
          isLoading={isLoading}
        />

        {dataQuery.isError && <EagerErrorBoundary error={dataQuery.error} />}

        {dataQuery.isLoading && (
          <div className={classNames(baseMessageDivClasses)}>Loading...</div>
        )}
        {dataQuery.data &&
          dataQuery.data.length === 0 &&
          !makeUseableSearchText(searchText) && (
            <div className={classNames(baseMessageDivClasses)}>
              <p>
                There are no cases visible in the dataset(s) of this release
              </p>
            </div>
          )}
        {dataQuery.data &&
          dataQuery.data.length === 0 &&
          makeUseableSearchText(searchText) && (
            <div className={classNames(baseMessageDivClasses)}>
              <p>
                Searching for the identifier <b>{searchText}</b> returned no
                results
              </p>
            </div>
          )}
        {dataQuery.data && dataQuery.data.length > 0 && (
          <>
            <div className={releasePatchMutate.isLoading ? "opacity-50" : ""}>
              {isEditable && (
                <div className="flex flex-wrap items-center border-b py-4">
                  <label>
                    <div className="inline-block w-12 text-center">
                      <IndeterminateCheckbox
                        className="checkbox-accent"
                        disabled={
                          releasePatchMutate.isLoading || releaseIsActivated
                        }
                        indeterminate={isSelectAllIndeterminate}
                        onChange={onSelectAllChange}
                      />
                    </div>
                    Select All
                  </label>
                </div>
              )}
              <Table
                additionalTableClassName="text-left text-sm text-gray-500"
                tableBody={dataQuery.data.map((row, rowIndex) => {
                  return (
                    <tr key={row.id} className="border-b">
                      <td
                        className={classNames(
                          baseColumnClasses,
                          "w-12",
                          "text-center"
                        )}
                      >
                        <IndeterminateCheckbox
                          disabled={true}
                          checked={row.nodeStatus === "selected"}
                          indeterminate={row.nodeStatus === "indeterminate"}
                        />
                      </td>
                      <td
                        className={classNames(
                          baseColumnClasses,
                          "text-left",
                          "w-40"
                        )}
                      >
                        <div className="flex space-x-1">
                          <span>{row.externalId}</span>
                          {showConsent && row.customConsent && (
                            <ConsentPopup
                              releaseKey={releaseKey}
                              nodeId={row.id}
                            />
                          )}
                        </div>
                      </td>
                      <td
                        className={classNames(
                          baseColumnClasses,
                          "text-left",
                          "pr-4"
                        )}
                      >
                        <PatientsFlexRow
                          releaseKey={releaseKey}
                          releaseIsActivated={releaseIsActivated}
                          patients={row.patients}
                          showCheckboxes={isEditable}
                          onCheckboxClicked={() =>
                            setIsSelectAllIndeterminate(true)
                          }
                          showConsent={showConsent}
                        />
                      </td>
                      {/* if we only have one dataset - then we don't show this column at all */}
                      {/* if this row is part of a rowspan then we also skip it (to make row spans work) */}
                      {datasetMap.size > 1 && rowSpans[rowIndex] >= 1 && (
                        <td
                          className={classNames(
                            baseColumnClasses,
                            "w-10",
                            "px-2",
                            "border-l",
                            "border-l-red-500"
                          )}
                          rowSpan={
                            rowSpans[rowIndex] === 1
                              ? undefined
                              : rowSpans[rowIndex]
                          }
                        >
                          <div className="w-6">
                            {datasetMap.get(row.fromDatasetUri)}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              />
            </div>
          </>
        )}
      </div>
      <div id="popup-root" />
    </Box>
  );
};
