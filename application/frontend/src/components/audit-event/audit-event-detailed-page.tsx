import { useParams, useResolvedPath } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { AuditEventFullType } from "@umccr/elsa-types/schemas-audit";
import SyntaxHighlighter from "react-syntax-highlighter";
import { EagerErrorBoundary } from "../errors";
import { Box } from "../boxes";
import { arduinoLight } from "react-syntax-highlighter/dist/esm/styles/hljs";

/**
 * Get the path segment before the id in the current resolved path.
 * @param id
 */
export const usePathSegmentBeforeId = (id?: string): string => {
  const resolvedPath = useResolvedPath(".").pathname;
  const substringPath = resolvedPath.substring(
    0,
    resolvedPath.indexOf(`/${id}`)
  );

  return substringPath.substring(substringPath.lastIndexOf("/") + 1);
};

/**
 * The audit event page shows a full audit entry event as a JSON.
 */
export const AuditEventDetailedPage = (): JSX.Element => {
  const { objectId } = useParams<{
    objectId: string;
  }>();

  const query = useQuery(
    [`audit-event-details`, objectId],
    async () => {
      return await axios
        .get<AuditEventFullType | null>(`/api/audit-event/details/${objectId}`)
        .then((response) => response.data);
    },
    { keepPreviousData: true, enabled: !!objectId }
  );

  if (!objectId) {
    return (
      <EagerErrorBoundary
        error={
          new Error(
            `this component should not be rendered outside a route with an objectId parameter`
          )
        }
      />
    );
  }

  return (
    <Box heading={`Audit event for ${objectId}`}>
      <div className="mt-2 flex flex-grow flex-row flex-wrap overflow-auto">
        {query.isError && <EagerErrorBoundary error={query.error} />}
        {query.isSuccess && (
          <AuditEventDetailedBox data={query.data ?? undefined} />
        )}
      </div>
    </Box>
  );
};

export type AuditEventDetailedBoxProps = {
  data?: AuditEventFullType;
};

/**
 * Render the audit event entry.
 */
export const AuditEventDetailedBox = ({
  data,
}: AuditEventDetailedBoxProps): JSX.Element => {
  return (
    // TODO convert this to a table format for more readability, add copy or download button.
    <SyntaxHighlighter
      language="json"
      style={arduinoLight}
      wrapLines={true}
      wrapLongLines={true}
    >
      {JSON.stringify(data, null, 2)}
    </SyntaxHighlighter>
  );
};
