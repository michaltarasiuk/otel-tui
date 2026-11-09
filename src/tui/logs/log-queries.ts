import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import type { HistogramRange } from "#tui/histogram/bars.ts";
import { bucketStart, TIME_BUCKET_MS, TimeBucket } from "#tui/histogram/time-columns.ts";
import { useConnection } from "#tui/query/connection.ts";
import { POLL_INTERVAL_MS } from "#tui/query/polling.ts";
import { searchParams } from "#tui/query/search.ts";

import { Log } from "./log.ts";
import { lowestSeverityNumber, type SeverityLevel } from "./severity.ts";
import logCount from "./sql/log-count.sql" with { type: "text" };
import logList from "./sql/log-list.sql" with { type: "text" };
import logTimeline from "./sql/log-timeline.sql" with { type: "text" };

const ANY_SEVERITY_NUMBER = 0;

interface LogFilter {
  search: string;
  minSeverity: SeverityLevel | undefined;
  traceId: string | undefined;
  spanId: string | undefined;
}

interface LogQuery extends LogFilter {
  timeRange: HistogramRange | undefined;
}

function filterParams({ search, minSeverity, traceId, spanId }: LogFilter) {
  return {
    ...searchParams(search),
    minSeverityNumber:
      minSeverity === undefined ? ANY_SEVERITY_NUMBER : lowestSeverityNumber(minSeverity),
    traceId: traceId ?? null,
    spanId: spanId ?? null,
  };
}

export function useLogList({ timeRange, ...filter }: LogQuery) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["logs", { ...filter, timeRange }],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(logList, {
        limit: 500,
        ...filterParams(filter),
        minTimeMs: timeRange?.from ?? null,
        maxTimeMs: timeRange?.to ?? null,
      });
      const rows = reader.getRowObjectsJS();
      return Log.array().parse(rows);
    },
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useLogTimeline(filter: LogFilter) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["logs", "timeline", filter],
    queryFn: async () => {
      const newestBucketMs = bucketStart(Date.now());
      const reader = await connection.runAndReadAll(logTimeline, {
        ...filterParams(filter),
        errorSeverityNumber: lowestSeverityNumber("ERROR"),
        bucketMs: TIME_BUCKET_MS,
        endMs: newestBucketMs + TIME_BUCKET_MS,
      });
      return { newestBucketMs, occupied: TimeBucket.array().parse(reader.getRowObjectsJS()) };
    },
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useLogTotalCount() {
  const connection = useConnection();

  return useQuery({
    queryKey: ["logs", "count"],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(logCount);
      return z.number().parse(reader.value(0, 0));
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}
