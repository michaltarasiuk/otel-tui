import type { DuckDBConnection } from "@duckdb/node-api";
import {
  queryOptions,
  useQuery,
  useSuspenseQueries,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { useConnection } from "#query/connection.ts";
import { POLL_INTERVAL_MS } from "#query/polling.ts";

import {
  countTraces,
  listTraces,
  readSpanContent,
  readTraceSpans,
  readTraceTimeline,
  type TraceQuery,
} from "./read-traces.ts";

async function readTraceList(connection: DuckDBConnection, query: TraceQuery) {
  const [traces, totalCount] = await Promise.all([
    listTraces(connection, query),
    countTraces(connection),
  ]);
  return { traces, totalCount };
}

export function useTraces({
  search,
  errorsOnly,
  serviceName,
  operationName,
  timeRange,
  sort,
}: TraceQuery) {
  const connection = useConnection();
  const filter = { search, errorsOnly, serviceName, operationName };

  return useSuspenseQueries({
    queries: [
      {
        queryKey: ["traces", { ...filter, timeRange, sort }],
        queryFn: () => readTraceList(connection, { ...filter, timeRange, sort }),
        refetchInterval: POLL_INTERVAL_MS,
      },
      {
        queryKey: ["traces", "timeline", filter],
        queryFn: () => readTraceTimeline(connection, filter),
        refetchInterval: POLL_INTERVAL_MS,
      },
    ],
  });
}

export function useTraceSpans(traceId: string) {
  const connection = useConnection();

  return useSuspenseQuery({
    queryKey: ["traces", traceId, "spans"],
    queryFn: () => readTraceSpans(connection, traceId),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

function spanContentQuery(
  connection: DuckDBConnection,
  traceId: string,
  spanId: string | undefined,
) {
  return queryOptions({
    queryKey: ["traces", traceId, "spans", spanId],
    queryFn: () => (spanId === undefined ? null : readSpanContent(connection, traceId, spanId)),
    staleTime: Infinity,
  });
}

export function useSpanContent(traceId: string, spanId: string | undefined) {
  const options = spanContentQuery(useConnection(), traceId, spanId);

  return useQuery({ ...options, enabled: spanId !== undefined });
}

export function useSuspenseSpanContent(traceId: string, spanId: string) {
  return useSuspenseQuery(spanContentQuery(useConnection(), traceId, spanId));
}
