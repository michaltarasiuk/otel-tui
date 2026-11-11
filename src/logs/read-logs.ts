import type { DuckDBConnection } from "@duckdb/node-api";
import { z } from "zod";

import logCount from "#logs/sql/log-count.sql" with { type: "text" };
import logList from "#logs/sql/log-list.sql" with { type: "text" };
import logTimeline from "#logs/sql/log-timeline.sql" with { type: "text" };
import { searchParams } from "#telemetry/search.ts";
import {
  bucketStart,
  TIME_BUCKET_MS,
  TimeBucket,
  type TimeRange,
} from "#telemetry/time-buckets.ts";

import { Log } from "./log.ts";
import { lowestSeverityNumber, type SeverityLevel } from "./severity.ts";

const LOG_LIMIT = 500;

const ANY_SEVERITY_NUMBER = 0;

export interface LogFilter {
  search: string;
  minSeverity: SeverityLevel | undefined;
  traceId: string | undefined;
  spanId: string | undefined;
}

export interface LogQuery extends LogFilter {
  timeRange: TimeRange | undefined;
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

export async function listLogs(connection: DuckDBConnection, { timeRange, ...filter }: LogQuery) {
  const reader = await connection.runAndReadAll(logList, {
    limit: LOG_LIMIT,
    ...filterParams(filter),
    minTimeMs: timeRange?.from ?? null,
    maxTimeMs: timeRange?.to ?? null,
  });
  return Log.array().parse(reader.getRowObjectsJS());
}

export async function readLogTimeline(connection: DuckDBConnection, filter: LogFilter) {
  const newestBucketMs = bucketStart(Date.now());
  const reader = await connection.runAndReadAll(logTimeline, {
    ...filterParams(filter),
    errorSeverityNumber: lowestSeverityNumber("ERROR"),
    bucketMs: TIME_BUCKET_MS,
    endMs: newestBucketMs + TIME_BUCKET_MS,
  });
  return { newestBucketMs, occupied: TimeBucket.array().parse(reader.getRowObjectsJS()) };
}

export async function countLogs(connection: DuckDBConnection) {
  const reader = await connection.runAndReadAll(logCount);
  return z.number().parse(reader.value(0, 0));
}
