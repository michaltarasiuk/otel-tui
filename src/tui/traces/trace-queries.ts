import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { containsPattern } from "../../utils/contains-pattern.ts";
import { useConnection } from "../connection.ts";
import { useVisible } from "../pane.tsx";
import { POLL_INTERVAL_MS } from "../polling.ts";
import type { HistogramRange } from "./histogram.ts";
import spanDetails from "./span-details.sql" with { type: "text" };
import { Span, SpanDetails } from "./span.ts";
import { bucketStart, TIME_BUCKET_MS, TimeBucket } from "./time-histogram.ts";
import traceCount from "./trace-count.sql" with { type: "text" };
import traceList from "./trace-list.sql" with { type: "text" };
import traceSpans from "./trace-spans.sql" with { type: "text" };
import traceTimeline from "./trace-timeline.sql" with { type: "text" };
import { Trace, type TraceSort } from "./trace.ts";

const MAX_TRACES = 500;

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
        limit: MAX_TRACES,
        pattern: containsPattern(search),
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
        pattern: containsPattern(search),
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
