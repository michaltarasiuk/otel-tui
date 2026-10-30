import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { containsPattern } from "../../utils/contains-pattern.ts";
import { useConnection } from "../connection.ts";
import SPAN_DETAILS_SQL from "./span-details.sql" with { type: "text" };
import { Span, SpanDetails } from "./span.ts";
import TRACE_COUNT_SQL from "./trace-count.sql" with { type: "text" };
import TRACE_LIST_SQL from "./trace-list.sql" with { type: "text" };
import TRACE_SPANS_SQL from "./trace-spans.sql" with { type: "text" };
import { Trace, type TraceSort } from "./trace.ts";

const POLL_INTERVAL_MS = 1000;
const MAX_TRACES = 500;

interface TraceQuery {
  search: string;
  errorsOnly: boolean;
  sort: TraceSort;
}

export function useTraceList({ search, errorsOnly, sort }: TraceQuery) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["traces", { search, errorsOnly, sort }],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(TRACE_LIST_SQL, {
        limit: MAX_TRACES,
        pattern: containsPattern(search),
        errorsOnly,
        sortBy: sort.column,
        direction: sort.descending ? -1 : 1,
      });
      const rows = reader.getRowObjectsJS();
      return Trace.array().parse(rows);
    },
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useTraceTotalCount() {
  const connection = useConnection();

  return useQuery({
    queryKey: ["traces", "count"],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(TRACE_COUNT_SQL);
      return z.number().parse(reader.value(0, 0));
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useTraceSpans(traceId: string) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["traces", traceId, "spans"],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(TRACE_SPANS_SQL, { traceId });
      return Span.array().parse(reader.getRowObjectsJS());
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSpanDetails(traceId: string, spanId: string) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["traces", traceId, "spans", spanId],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(SPAN_DETAILS_SQL, { traceId, spanId });
      const [row] = reader.getRowObjectsJS();
      return row === undefined ? null : SpanDetails.parse(row);
    },
    staleTime: Infinity,
  });
}
