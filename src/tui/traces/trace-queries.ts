import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  countTraces,
  listTraces,
  readSpanContent,
  readTraceSpans,
  readTraceTimeline,
  type TraceFilter,
  type TraceQuery,
} from "#telemetry/traces/read-traces.ts";
import { useConnection } from "#tui/query/connection.ts";
import { POLL_INTERVAL_MS } from "#tui/query/polling.ts";

export function useTraceList({
  search,
  errorsOnly,
  serviceName,
  operationName,
  timeRange,
  sort,
}: TraceQuery) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["traces", { search, errorsOnly, serviceName, operationName, timeRange, sort }],
    queryFn: () =>
      listTraces(connection, { search, errorsOnly, serviceName, operationName, timeRange, sort }),
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useTraceTimeline({ search, errorsOnly, serviceName, operationName }: TraceFilter) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["traces", "timeline", { search, errorsOnly, serviceName, operationName }],
    queryFn: () =>
      readTraceTimeline(connection, { search, errorsOnly, serviceName, operationName }),
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useTraceTotalCount() {
  const connection = useConnection();

  return useQuery({
    queryKey: ["traces", "count"],
    queryFn: () => countTraces(connection),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useTraceSpans(traceId: string) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["traces", traceId, "spans"],
    queryFn: () => readTraceSpans(connection, traceId),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSpanContent(traceId: string, spanId: string | undefined) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["traces", traceId, "spans", spanId],
    enabled: spanId !== undefined,
    queryFn: () => (spanId === undefined ? null : readSpanContent(connection, traceId, spanId)),
    staleTime: Infinity,
  });
}
