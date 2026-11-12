import type { DuckDBConnection } from "@duckdb/node-api";
import { queryOptions } from "@tanstack/react-query";

import { POLL_INTERVAL_MS } from "#query/polling.ts";

import {
  readSpanContent,
  readTraceList,
  readTraceSpans,
  readTraceTimeline,
  type TraceFilter,
  type TraceQuery,
} from "./read-traces.ts";

export function traceListQuery(connection: DuckDBConnection, query: TraceQuery) {
  return queryOptions({
    queryKey: ["traces", query],
    queryFn: () => readTraceList(connection, query),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function traceTimelineQuery(connection: DuckDBConnection, filter: TraceFilter) {
  return queryOptions({
    queryKey: ["traces", "timeline", filter],
    queryFn: () => readTraceTimeline(connection, filter),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function traceSpansQuery(connection: DuckDBConnection, traceId: string) {
  return queryOptions({
    queryKey: ["traces", traceId, "spans"],
    queryFn: () => readTraceSpans(connection, traceId),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function spanContentQuery(
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
