import type { DuckDBConnection } from "@duckdb/node-api";
import { z } from "zod";

import type { SpanKind, SpanStatus } from "../trace.ts";

// Indexed by the OTLP SpanKind and StatusCode enum values.
const SPAN_KINDS: SpanKind[] = [
  "unspecified",
  "internal",
  "server",
  "client",
  "producer",
  "consumer",
];
const STATUS_ERROR = 2;
const STATUS_OK = 1;

const IS_ROOT = "coalesce(parent_span_id, '') = ''";

const NullableStringSchema = z
  .string()
  .nullable()
  .transform((value) => value ?? undefined);

const SummaryRowSchema = z.object({
  trace_id: z.string(),
  start_ms: z.number(),
  root_name: z.string(),
  service: z.string(),
  span_count: z.number(),
  duration_ms: z.number(),
  error_count: z.number(),
});

const SpanRowSchema = z.object({
  span_id: z.string(),
  parent_span_id: NullableStringSchema,
  name: z.string(),
  service_name: NullableStringSchema,
  kind: z.number(),
  status_code: z.number(),
  status_message: NullableStringSchema,
  start_ms: z.number(),
  duration_ms: z.number(),
  span_attributes: NullableStringSchema,
  resource_attributes: NullableStringSchema,
  events_json: NullableStringSchema,
});

const AttributesSchema = z.record(z.string(), z.unknown());

const EventsSchema = z.array(
  z.object({
    name: z.string(),
    time_unix_nano: z.number(),
    attributes: AttributesSchema.optional(),
  }),
);

export async function queryTraceSummaries(connection: DuckDBConnection, limit: number) {
  // A trace without a root span yet falls back to its earliest span.
  const reader = await connection.runAndReadAll(
    `SELECT
      trace_id,
      min(epoch_us(start_time_unix_nano)) / 1000 AS start_ms,
      coalesce(
        arg_min(name, start_time_unix_nano) FILTER (WHERE ${IS_ROOT}),
        arg_min(name, start_time_unix_nano)
      ) AS root_name,
      coalesce(
        arg_min(service_name, start_time_unix_nano) FILTER (WHERE ${IS_ROOT}),
        arg_min(service_name, start_time_unix_nano),
        'unknown'
      ) AS service,
      count(DISTINCT span_id)::INTEGER AS span_count,
      (max(epoch_us(start_time_unix_nano) + duration_time_unix_nano / 1000)
        - min(epoch_us(start_time_unix_nano))) / 1000 AS duration_ms,
      count(DISTINCT span_id) FILTER (WHERE status_code = ${STATUS_ERROR})::INTEGER AS error_count
    FROM otlp_traces
    GROUP BY trace_id
    ORDER BY start_ms DESC
    LIMIT $limit`,
    { limit },
  );
  return reader.getRowObjectsJS().map((row) => toSummary(SummaryRowSchema.parse(row)));
}

export async function queryTrace(connection: DuckDBConnection, traceId: string) {
  // Exporters can retry a batch, so keep one row per span.
  const reader = await connection.runAndReadAll(
    `SELECT
      span_id,
      parent_span_id,
      name,
      service_name,
      kind,
      status_code,
      status_status_message AS status_message,
      epoch_us(start_time_unix_nano) / 1000 AS start_ms,
      duration_time_unix_nano / 1e6 AS duration_ms,
      span_attributes,
      resource_attributes,
      events_json
    FROM otlp_traces
    WHERE trace_id = $traceId
    QUALIFY row_number() OVER (PARTITION BY span_id) = 1
    ORDER BY start_time_unix_nano`,
    { traceId },
  );
  const rows = reader.getRowObjectsJS().map((row) => SpanRowSchema.parse(row));
  const first = rows[0];
  if (first === undefined) {
    return undefined;
  }
  return {
    traceId,
    startTime: first.start_ms,
    spans: rows.map((row) => toSpan(row, first.start_ms)),
  };
}

function toSummary(row: z.infer<typeof SummaryRowSchema>) {
  return {
    traceId: row.trace_id,
    startTime: row.start_ms,
    rootName: row.root_name,
    service: row.service,
    spanCount: row.span_count,
    durationMs: row.duration_ms,
    errorCount: row.error_count,
  };
}

function toSpan(row: z.infer<typeof SpanRowSchema>, traceStartMs: number) {
  return {
    spanId: row.span_id,
    parentSpanId: row.parent_span_id || undefined,
    name: row.name,
    service: row.service_name ?? "unknown",
    kind: SPAN_KINDS[row.kind] ?? "unspecified",
    offsetMs: row.start_ms - traceStartMs,
    durationMs: row.duration_ms,
    status: toStatus(row.status_code, row.status_message),
    attributes: parseAttributes(row.span_attributes),
    resource: parseAttributes(row.resource_attributes),
    events: parseEvents(row.events_json, row.start_ms),
  };
}

function toStatus(code: number, message: string | undefined): SpanStatus {
  if (code === STATUS_ERROR) return { code: "error", message: message ?? "" };
  if (code === STATUS_OK) return { code: "ok" };
  return { code: "unset" };
}

function parseAttributes(json: string | undefined) {
  if (json === undefined) {
    return {};
  }
  const attributes = AttributesSchema.parse(JSON.parse(json));
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [key, toAttributeValue(value)]),
  );
}

function parseEvents(json: string | undefined, spanStartMs: number) {
  if (json === undefined) {
    return [];
  }
  return EventsSchema.parse(JSON.parse(json)).map((event) => ({
    name: event.name,
    // Nanosecond epochs exceed Number precision, but stay accurate to well under a millisecond.
    offsetMs: event.time_unix_nano / 1e6 - spanStartMs,
    attributes: Object.fromEntries(
      Object.entries(event.attributes ?? {}).map(([key, value]) => [key, toAttributeValue(value)]),
    ),
  }));
}

function toAttributeValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return JSON.stringify(value);
}
