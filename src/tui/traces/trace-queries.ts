import { keepPreviousData, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";

import { useConnection } from "#tui/query/connection.ts";
import { POLL_INTERVAL_MS } from "#tui/query/polling.ts";
import { searchParams } from "#tui/query/search.ts";

import type { HistogramRange } from "./histogram.ts";
import { Span, SpanContent } from "./span.ts";
import spanDetails from "./sql/span-details.sql" with { type: "text" };
import traceCount from "./sql/trace-count.sql" with { type: "text" };
import traceList from "./sql/trace-list.sql" with { type: "text" };
import traceSpans from "./sql/trace-spans.sql" with { type: "text" };
import traceTimeline from "./sql/trace-timeline.sql" with { type: "text" };
import { bucketStart, TIME_BUCKET_MS, TimeBucket } from "./time-histogram.ts";
import { Trace, type TraceSort } from "./trace.ts";

interface TraceFilter {
  search: string;
  errorsOnly: boolean;
}

interface TraceQuery extends TraceFilter {
  timeRange: HistogramRange | undefined;
  sort: TraceSort;
}

export function useTraceList({ search, errorsOnly, timeRange, sort }: TraceQuery) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["traces", { search, errorsOnly, timeRange, sort }],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(traceList, {
        limit: 500,
        ...searchParams(search),
        errorsOnly,
        minTimeMs: timeRange?.from ?? null,
        maxTimeMs: timeRange?.to ?? null,
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

export function useTraceTimeline({ search, errorsOnly }: TraceFilter) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["traces", "timeline", { search, errorsOnly }],
    queryFn: async () => {
      const newestBucketMs = bucketStart(Date.now());
      const reader = await connection.runAndReadAll(traceTimeline, {
        ...searchParams(search),
        errorsOnly,
        bucketMs: TIME_BUCKET_MS,
        endMs: newestBucketMs + TIME_BUCKET_MS,
      });
      const rows = reader.getRowObjectsJS();
      return { newestBucketMs, occupied: TimeBucket.array().parse(rows) };
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
      const reader = await connection.runAndReadAll(traceCount);
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
      const reader = await connection.runAndReadAll(traceSpans, { traceId });
      return Span.array().parse(reader.getRowObjectsJS());
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSpanContent(traceId: string, spanId: string) {
  const connection = useConnection();

  return useSuspenseQuery({
    queryKey: ["traces", traceId, "spans", spanId],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(spanDetails, { traceId, spanId });
      const [row] = reader.getRowObjectsJS();
      return row === undefined ? null : SpanContent.parse(row);
    },
    staleTime: Infinity,
  });
}
