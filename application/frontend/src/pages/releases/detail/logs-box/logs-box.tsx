import React, {
  Dispatch,
  Fragment,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { AuditEntryType } from "@umccr/elsa-types";
import axios from "axios";
import { useQuery, UseQueryResult } from "react-query";
import { BoxNoPad } from "../../../../components/boxes";
import { BoxPaginator } from "../../../../components/box-paginator";
import {
  ColumnSizingHeader,
  CoreHeader,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  RowData,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  formatDuration,
  formatFromNowTime,
  formatLocalDateTime,
} from "../../../../helpers/datetime-helper";
import {
  ActionCategoryType,
  AuditEntryDetailsType,
} from "@umccr/elsa-types/schemas-audit";
import { Table } from "../../../../components/tables";
import { ToolTip } from "../../../../components/tooltip";
import {
  BiChevronDown,
  BiChevronRight,
  BiChevronUp,
  BiLinkExternal,
} from "react-icons/bi";
import classNames from "classnames";
import { ErrorBoundary } from "../../../../components/error-boundary";
import {handleTotalCountHeaders} from "../../../../helpers/paging-helper";
import {Base7807Error} from "@umccr/elsa-types/error-types";

declare module "@tanstack/table-core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    headerStyling?: string;
    cellStyling?: string;
  }
}

/**
 * Maximum character length of details rendered in log box.
 */
// Allow this to be set somewhere?
export const MAXIMUM_DETAIL_LENGTH = 1000;

type LogsBoxProps = {
  releaseId: string;
  // the (max) number of log items shown on any single page
  pageSize: number;
};

/**
 * Wrapper around a useQuery hook for an audit entry event.
 */
export const useAuditEventQuery = (
  currentPage: number,
  releaseId: string,
  orderByProperty: string,
  orderAscending: boolean,
  setCurrentTotal: Dispatch<SetStateAction<number>>,
  setData: Dispatch<SetStateAction<AuditEntryType[]>>,
  setIsSuccess: Dispatch<SetStateAction<boolean>>,
  setError: Dispatch<SetStateAction<any | null>>
) => {
  return useQuery(
    [
      "releases-audit-log",
      currentPage,
      releaseId,
      orderByProperty,
      orderAscending,
    ],
    async () => {
      throw new Base7807Error("Internal Server Error", 500);
      return await axios
        .get<AuditEntryType[]>(
          `/api/releases/${releaseId}/audit-log?page=${currentPage}&orderByProperty=${orderByProperty}&orderAscending=${orderAscending}`
        )
        .then((response) => {
          handleTotalCountHeaders(response, setCurrentTotal);

          return response.data;
        });
    },
    {
      keepPreviousData: true,
      enabled: false,
      onSuccess: (data) => {
        setData(data ?? []);
        setIsSuccess(data !== undefined);
        setError(null);
      },
      onError: (err) => {
        console.log("HERE");
        console.log(err);
        setData([]);
        setIsSuccess(false);
        setError(err);
      }
    }
  );
};

/**
 * Declares all audit entry queries used by the logs box.
 */
export const useAllAuditEventQueries = (
  currentPage: number,
  releaseId: string,
  setCurrentTotal: Dispatch<SetStateAction<number>>,
  setData: Dispatch<SetStateAction<AuditEntryType[]>>,
  setIsSuccess: Dispatch<SetStateAction<boolean>>,
  setError: Dispatch<SetStateAction<any | null>>
): { [key: string]: UseQueryResult<AuditEntryType[]> } => {
  const useAuditEventQueryFn = (
    occurredDateTime: string,
    orderAscending: boolean
  ) => {
    return useAuditEventQuery(
      currentPage,
      releaseId,
      occurredDateTime,
      orderAscending,
      setCurrentTotal,
      setData,
      setIsSuccess,
      setError
    );
  };

  return {
    occurredDateTimeAsc: useAuditEventQueryFn("occurredDateTime", true),
    occurredDateTimeDesc: useAuditEventQueryFn("occurredDateTime", false),
    outcomeAsc: useAuditEventQueryFn("outcome", true),
    outcomeDesc: useAuditEventQueryFn("outcome", false),
    actionCategoryAsc: useAuditEventQueryFn("actionCategory", true),
    actionCategoryDesc: useAuditEventQueryFn("actionCategory", false),
    actionDescriptionAsc: useAuditEventQueryFn("actionDescription", true),
    actionDescriptionDesc: useAuditEventQueryFn("actionDescription", false),
    whoDisplayNameAsc: useAuditEventQueryFn("whoDisplayName", true),
    whoDisplayNameDesc: useAuditEventQueryFn("whoDisplayName", false),
    occurredDurationAsc: useAuditEventQueryFn("occurredDuration", true),
    occurredDurationDesc: useAuditEventQueryFn("occurredDuration", false),
  };
};

export type AuditEntryTableHeaderProps<TData, TValue> = {
  header: CoreHeader<TData, TValue> & ColumnSizingHeader;
};

/**
 * Refactored code that goes in the main header components of the table.
 */
export const AuditEntryTableHeader = <TData, TValue>({
  header,
}: AuditEntryTableHeaderProps<TData, TValue>): JSX.Element => {
  return (
    <div
      onClick={header.column.getToggleSortingHandler()}
      className="flex flex-nowrap space-x-1"
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      {{
        asc: <BiChevronUp />,
        desc: <BiChevronDown />,
      }[header.column.getIsSorted() as string] ?? null}
    </div>
  );
};

/**
 * The main logs box component.
 */
export const LogsBox = ({ releaseId, pageSize }: LogsBoxProps): JSX.Element => {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTotal, setCurrentTotal] = useState(1);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [updateData, setUpdateData] = useState(true);

  const [data, setData] = useState([] as AuditEntryType[]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<any | null>(null);

  const dataQueries = useAllAuditEventQueries(
    currentPage,
    releaseId,
    setCurrentTotal,
    setData,
    setIsSuccess,
    setError
  );
  console.log('HERE2');
  console.log(error);

  useEffect(() => {
    if (updateData) {
      let key;
      if (sorting.length === 0) {
        key = "occurredDateTimeDesc";
      } else {
        const { id, desc } = sorting[0];
        key = desc ? id + "Desc" : id + "Asc";
      }

      if (key in dataQueries) {
        void dataQueries[key].refetch();
      }

      setUpdateData(false);
    }
  }, [updateData, dataQueries, sorting]);

  const table = useReactTable({
    data: data,
    columns: createColumns(releaseId),
    state: {
      sorting,
    },
    onSortingChange: (state) => {
      setSorting(state);
      setUpdateData(true);
    },
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualSorting: true,
  });

  // TODO Search and filtering functionality, refresh button, download audit log button, refresh loading wheel.
  return (
    <BoxNoPad heading="Audit Logs" errorMessage={"Something went wrong fetching audit logs."}>
      <div className="flex flex-col">
        {isSuccess ? <Table
          tableHead={table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="text-sm text-gray-500 whitespace-nowrap border-b bg-slate-50 border-slate-700"
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={
                    header.id === "objectId"
                      ? table.getToggleAllRowsExpandedHandler()
                      : () => {}
                  }
                  className={
                    !header.column.columnDef.meta?.headerStyling
                      ? "py-4 text-sm text-gray-600 whitespace-nowrap border-b hover:bg-slate-100 hover:rounded-lg"
                      : header.column.columnDef.meta.headerStyling
                  }
                >
                  {header.isPlaceholder ? undefined : (
                    <AuditEntryTableHeader header={header} />
                  )}
                </th>
              ))}
            </tr>
          ))}
          tableBody={
            table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <tr
                  key={row.id}
                  onClick={() =>
                    row.getCanExpand() &&
                    row.getValue("hasDetails") &&
                    row.toggleExpanded()
                  }
                  className="group text-sm text-gray-500 whitespace-nowrap border-b odd:bg-white even:bg-slate-50 border-slate-700 hover:bg-slate-100 hover:rounded-lg"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={
                        !cell.column.columnDef.meta?.cellStyling
                          ? "py-4 text-sm text-gray-500 whitespace-nowrap border-b"
                          : cell.column.columnDef.meta?.cellStyling
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() &&
                  (row.getValue("hasDetails") as boolean) && (
                    <tr
                      key={row.original.objectId}
                      className="text-sm text-gray-500 border-b odd:bg-white even:bg-slate-50 border-slate-700"
                    >
                      <td
                        key={row.original.objectId}
                        colSpan={row.getVisibleCells().length}
                        className="p-4 left text-sm text-gray-500 border-b"
                      >
                        <DetailsRow
                          releaseId={releaseId}
                          objectId={row.original.objectId}
                        />
                      </td>
                    </tr>
                  )}
              </Fragment>
            ))
          }
        /> : <ErrorBoundary message={"Could not display logs table."}
                            error={error}
                            displayEagerly={true}
                            styling={"bg-red-100"}
                            key={isSuccess.toString()} />}
        <BoxPaginator
          currentPage={currentPage}
          setPage={(n) => {
            table.reset();
            setUpdateData(true);
            setCurrentPage(n);
          }}
          rowCount={currentTotal}
          rowsPerPage={pageSize}
          rowWord="Log Entries"
        />
      </div>
    </BoxNoPad>
  );
};

export type DetailsRowProps = {
  releaseId: string;
  objectId: string;
};

/**
 * The details row shown when clicking on a row.
 */
const DetailsRow = ({ releaseId, objectId }: DetailsRowProps): JSX.Element => {
  const detailsQuery = useQuery(
    ["releases-audit-log-details", objectId],
    async () => {
      return await axios
        .get<AuditEntryDetailsType | null>(
          `/api/releases/${releaseId}/audit-log/details?id=${objectId}&start=0&end=${MAXIMUM_DETAIL_LENGTH}`
        )
        .then((response) => response.data);
    },
    { keepPreviousData: true }
  );

  return detailsQuery.isSuccess && detailsQuery.data?.details ? (
    <div className="text-sm font-mono whitespace-pre-wrap">
      {detailsQuery.data.details}
      {detailsQuery.data.truncated ? (
        <div className="pl-8 pt-2 text-sm font-mono whitespace-pre-wrap italic text-gray-400 font-bold">
          ...
        </div>
      ) : (
        <></>
      )}
    </div>
  ) : detailsQuery.isError ? (
    <ErrorBoundary message={"Something went wrong displaying audit log details."}
                   error={detailsQuery.error}
                   displayEagerly={true}
                   styling={"bg-red-100"} />
    ) : (
    <></>
  );
};

export type ExpanderIndicatorProps = {
  isExpanded: boolean;
  symbolUnexpanded?: ReactNode;
  symbolExpanded?: ReactNode;
};

/**
 * An indicator for when a row is expanded.
 */
export const ExpandedIndicator = ({
  isExpanded,
  symbolUnexpanded,
  symbolExpanded,
}: ExpanderIndicatorProps): JSX.Element => {
  return (
    <div className={CELL_BOX}>
      {isExpanded ? symbolExpanded : symbolUnexpanded}
    </div>
  );
};

/**
 * Convert an `ActionCategoryType` to a description.
 */
export const categoryToDescription = (category: ActionCategoryType): string => {
  if (category === "C") {
    return "Create";
  } else if (category === "R") {
    return "Read";
  } else if (category === "U") {
    return "Update";
  } else if (category === "D") {
    return "Delete";
  } else {
    return "Execute";
  }
};

/**
 * Convert a numerical outcome code to a description.
 */
export const outcomeToDescription = (outcome: number): string | undefined => {
  if (outcome === 0) {
    return "Success";
  } else if (outcome === 4) {
    return "Minor Failure";
  } else if (outcome === 8) {
    return "Serious Failure";
  } else if (outcome === 12) {
    return "Major Failure";
  } else {
    return undefined;
  }
};

/**
 * Check if an outcome is successful.
 */
export const outcomeIsSuccess = (outcome: number): boolean => {
  return outcome === 0;
};

export const CELL_BOX = "flex items-center justify-center w-8 h-8";

/**
 * Create the column definition based on the audit entry type.
 */
export const createColumns = (releaseId: string) => {
  const columnHelper = createColumnHelper<AuditEntryType>();
  return [
    columnHelper.accessor("objectId", {
      header: ({ table }) => {
        return table.getCanSomeRowsExpand() &&
          table
            .getRowModel()
            .rows.map((row) => row.getValue("hasDetails"))
            .some(Boolean) ? (
          <ToolTip
            trigger={
              <ExpandedIndicator
                isExpanded={table.getIsAllRowsExpanded()}
                symbolUnexpanded={<BiChevronRight />}
                symbolExpanded={<BiChevronDown />}
              ></ExpandedIndicator>
            }
            applyCSS={"flex-1 font-normal flex py-2"}
            description={
              table.getIsAllRowsExpanded() ? "Contract All" : "Expand All"
            }
          />
        ) : null;
      },
      cell: (info) => {
        const isExpandedWithDetails =
          info.row.getCanExpand() && info.row.getValue("hasDetails");
        return (
          <div className="flex justify-start">
            <ExpandedIndicator
              isExpanded={info.row.getIsExpanded()}
              symbolUnexpanded={
                isExpandedWithDetails ? <BiChevronRight /> : undefined
              }
              symbolExpanded={
                isExpandedWithDetails ? <BiChevronDown /> : undefined
              }
            />
            <ToolTip
              trigger={
                <a
                  href={`/releases/${releaseId}/audit-log/${info.getValue()}`}
                  className={classNames(
                    "block hover:bg-slate-200 hover:rounded-lg invisible group-hover:visible",
                    CELL_BOX
                  )}
                >
                  <BiLinkExternal />
                </a>
              }
              description={"View Entry"}
            />
          </div>
        );
      },
      meta: {
        cellStyling: "text-sm text-gray-500 whitespace-nowrap border-b",
        headerStyling:
          "text-sm text-gray-600 whitespace-nowrap border-b hover:bg-slate-100 hover:rounded-lg",
      },
      enableSorting: false,
    }),
    columnHelper.accessor("hasDetails", {
      header: () => null,
      cell: () => null,
      enableSorting: false,
    }),
    columnHelper.accessor("occurredDateTime", {
      header: "Time",
      cell: (info) => {
        const dateTime = info.getValue() as string | undefined;
        return (
          <ToolTip
            trigger={formatFromNowTime(dateTime)}
            description={formatLocalDateTime(dateTime)}
          ></ToolTip>
        );
      },
      sortDescFirst: true,
    }),
    columnHelper.accessor("outcome", {
      header: "Outcome",
      cell: (info) => {
        const value = info.getValue();
        return (
          <ToolTip
            trigger={value}
            applyCSS={
              outcomeIsSuccess(value)
                ? classNames("rounded-lg bg-green-200", CELL_BOX)
                : classNames("rounded-lg bg-red-200", CELL_BOX)
            }
            description={outcomeToDescription(value)}
          ></ToolTip>
        );
      },
      meta: {
        cellStyling: "text-sm text-gray-500 whitespace-nowrap border-b",
      },
      sortDescFirst: true,
    }),
    columnHelper.accessor("actionCategory", {
      header: "Category",
      cell: (info) => {
        const value = info.getValue();
        return (
          <ToolTip
            trigger={<div className="flex items-center w-8 h-8">{value}</div>}
            description={categoryToDescription(value)}
          ></ToolTip>
        );
      },
      meta: {
        cellStyling: "text-sm text-gray-500 whitespace-nowrap border-b",
      },
      sortDescFirst: true,
    }),
    columnHelper.accessor("actionDescription", {
      header: "Description",
      sortDescFirst: true,
    }),
    columnHelper.accessor("whoDisplayName", {
      header: "Name",
      sortDescFirst: true,
    }),
    columnHelper.accessor("occurredDuration", {
      header: "Duration",
      cell: (info) => formatDuration(info.getValue()),
      sortDescFirst: true,
    }),
  ];
};
