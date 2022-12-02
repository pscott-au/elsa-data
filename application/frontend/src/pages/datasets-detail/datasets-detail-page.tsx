import React from "react";
import { useQuery } from "react-query";
import axios from "axios";
import { useParams } from "react-router-dom";
import { Box } from "../../components/boxes";
import { DatasetDeepType } from "@umccr/elsa-types";
import { LayoutBase } from "../../layouts/layout-base";
import JSONToTable from "../../components/json-to-table";
import { fileSize } from "humanize-plus";
import { EagerErrorBoundary } from "../../components/error-boundary";

type DatasetsSpecificPageParams = {
  datasetId: string;
};

const DATASET_REACT_QUERY_KEY = "dataset";

export const DatasetsDetailPage: React.FC = () => {
  const { datasetId: datasetIdParam } = useParams<DatasetsSpecificPageParams>();

  const { data: datasetData, error } = useQuery({
    queryKey: [DATASET_REACT_QUERY_KEY, datasetIdParam],
    queryFn: async ({ queryKey }) => {
      const did = queryKey[1];

      return await axios
        .get<DatasetDeepType>(`/api/datasets/${did}`)
        .then((response) => response.data);
    },
  });

  return (
    <LayoutBase>
      <div className="flex flex-row flex-wrap flex-grow mt-2">
        {datasetData && (
          <>
            <Box heading="Summary">
              <JSONToTable
                jsonObj={{
                  ID: datasetData.id,
                  URI: datasetData.uri,
                  Description: datasetData.description,
                  "Artifact Count": datasetData.summaryArtifactCount,
                  "Artifact Filetypes":
                    datasetData.summaryArtifactIncludes != ""
                      ? datasetData.summaryArtifactIncludes.replaceAll(" ", "/")
                      : "-",
                  "Artifact Size": fileSize(
                    datasetData.summaryArtifactSizeBytes
                  ),
                  Configuration: configurationChip(datasetData.isInConfig),
                }}
              />
            </Box>

            <Box
              heading={
                <div className="flex items-center	justify-between">
                  <div>Content</div>
                  <button
                    disabled={!datasetData.id}
                    onClick={async () =>
                      await axios.post<any>(`/api/datasets/sync/`, {
                        datasetURI: datasetData.uri,
                      })
                    }
                    type="button"
                    className="cursor-pointer	inline-block px-6 py-2.5 bg-slate-200	text-slate-500	font-medium text-xs rounded shadow-md hover:bg-slate-300 hover:shadow-lg focus:shadow-lg focus:outline-none focus:ring-0 active:bg-slate-400 active:text-white active:shadow-lg"
                  >
                    SYNC
                  </button>
                </div>
              }
            >
              <div>
                {datasetData && (
                  <pre>{JSON.stringify(datasetData, null, 2)}</pre>
                )}
              </div>
            </Box>
          </>
        )}
        {error && (
          <EagerErrorBoundary
            message={"Something went wrong fetching datasets."}
            error={error}
            styling={"bg-red-100"}
          />
        )}
      </div>
    </LayoutBase>
  );
};

/**
 * Component helper
 */

const configurationChip = (isConfig: boolean) => {
  if (isConfig) {
    return (
      <span className="text-xs inline-block py-1 px-2.5 leading-none text-center whitespace-nowrap align-baseline bg-green-200 text-green-700 rounded-full">
        OK
      </span>
    );
  }

  return (
    <span className="text-xs inline-block py-1 px-2.5 leading-none text-center whitespace-nowrap align-baseline bg-orange-200 text-orange-600 rounded-full">
      Missing configuration
    </span>
  );
};
