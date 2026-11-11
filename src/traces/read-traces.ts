import type { DuckDBConnection } from "@duckdb/node-api";
import { z } from "zod";

import { searchParams } from "#telemetry/search.ts";
import {
  bucketStart,
  TIME_BUCKET_MS,
  TimeBucket,
  type TimeRange,
} from "#telemetry/time-buckets.ts";
import spanDetails from "#traces/sql/span-details.sql" with { type: "text" };
import traceCount from "#traces/sql/trace-count.sql" with { type: "text" };
import traceList from "#traces/sql/trace-list.sql" with { type: "text" };
import traceSpans from "#traces/sql/trace-spans.sql" with { type: "text" };
import traceTimeline from "#traces/sql/trace-timeline.sql" with { type: "text" };

import { Span, SpanContent } from "./span.ts";
import { Trace, type TraceSort } from "./trace.ts";

const TRACE_LIMIT = 500;

export interface TraceFilter {
  search: string;
  errorsOnly: boolean;
  serviceName: string | undefined;
  operationName: string | undefined;
}

export interface TraceQuery extends TraceFilter {
  timeRange: TimeRange | undefined;
  sort: TraceSort;
}

function filterParams({ search, errorsOnly, serviceName, operationName }: TraceFilter) {
  return {
    ...searchParams(search),
    errorsOnly,
    serviceName: serviceName ?? null,
    operationName: operationName ?? null,
  };
}

export async function listTraces(
  connection: DuckDBConnection,
  { timeRange, sort, ...filter }: TraceQuery,
) {
  const reader = await connection.runAndReadAll(traceList, {
    limit: TRACE_LIMIT,
    ...filterParams(filter),
    minTimeMs: timeRange?.from ?? null,
    maxTimeMs: timeRange?.to ?? null,
    sortBy: sort.column,
    direction: sort.descending ? -1 : 1,
  });
  return Trace.array().parse(reader.getRowObjectsJS());
}

export async function readTraceTimeline(connection: DuckDBConnection, filter: TraceFilter) {
  const newestBucketMs = bucketStart(Date.now());
  const reader = await connection.runAndReadAll(traceTimeline, {
    ...filterParams(filter),
    bucketMs: TIME_BUCKET_MS,
    endMs: newestBucketMs + TIME_BUCKET_MS,
  });
  return { newestBucketMs, occupied: TimeBucket.array().parse(reader.getRowObjectsJS()) };
}

export async function countTraces(connection: DuckDBConnection) {
  const reader = await connection.runAndReadAll(traceCount);
  return z.number().parse(reader.value(0, 0));
}

export async function readTraceSpans(connection: DuckDBConnection, traceId: string) {
  const reader = await connection.runAndReadAll(traceSpans, { traceId });
  return Span.array().parse(reader.getRowObjectsJS());
}

export async function readSpanContent(
  connection: DuckDBConnection,
  traceId: string,
  spanId: string,
) {
  const reader = await connection.runAndReadAll(spanDetails, { traceId, spanId });
  const [row] = reader.getRowObjectsJS();
  return row === undefined ? null : SpanContent.parse(row);
}
