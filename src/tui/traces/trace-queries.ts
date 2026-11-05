import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { useVisible } from "#tui/components/pane.tsx";
import { useConnection } from "#tui/query/connection.ts";
import { substringPattern } from "#tui/query/like-pattern.ts";
import { POLL_INTERVAL_MS } from "#tui/query/polling.ts";

import type { HistogramRange } from "./histogram.ts";
import { Span, SpanDetails } from "./span.ts";
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
  const visible = useVisible();

  return useQuery({
    queryKey: ["traces", { search, errorsOnly, timeRange, sort }],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(traceList, {
        limit: 500,
        pattern: substringPattern(search),
        errorsOnly,
        minTimeMs: timeRange?.from ?? null,
        maxTimeMs: timeRange?.to ?? null,
        sortBy: sort.column,
        direction: sort.descending ? -1 : 1,
      });
      const rows = reader.getRowObjectsJS();
      return Trace.array().parse(rows);
    },
    enabled: visible,
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useTraceTimeline({ search, errorsOnly }: TraceFilter) {
  const connection = useConnection();
  const visible = useVisible();

  return useQuery({
    queryKey: ["traces", "timeline", { search, errorsOnly }],
    queryFn: async () => {
      const newestBucketMs = bucketStart(Date.now());
      const reader = await connection.runAndReadAll(traceTimeline, {
        pattern: substringPattern(search),
        errorsOnly,
        bucketMs: TIME_BUCKET_MS,
        endMs: newestBucketMs + TIME_BUCKET_MS,
      });
      const rows = reader.getRowObjectsJS();
      return { newestBucketMs, occupied: TimeBucket.array().parse(rows) };
    },
    enabled: visible,
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useTraceTotalCount() {
  const connection = useConnection();
  const visible = useVisible();

  return useQuery({
    queryKey: ["traces", "count"],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(traceCount);
      return z.number().parse(reader.value(0, 0));
    },
    enabled: visible,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useTraceSpans(traceId: string) {
  const connection = useConnection();
  const visible = useVisible();

  return useQuery({
    queryKey: ["traces", traceId, "spans"],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(traceSpans, { traceId });
      return Span.array().parse(reader.getRowObjectsJS());
    },
    enabled: visible,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSpanDetails(traceId: string, spanId: string) {
  const connection = useConnection();
  const visible = useVisible();

  return useQuery({
    queryKey: ["traces", traceId, "spans", spanId],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(spanDetails, { traceId, spanId });
      const [row] = reader.getRowObjectsJS();
      return row === undefined ? null : SpanDetails.parse(row);
    },
    enabled: visible,
    staleTime: Infinity,
  });
}
