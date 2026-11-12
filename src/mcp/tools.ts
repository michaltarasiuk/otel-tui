import type { DuckDBConnection } from "@duckdb/node-api";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { Log } from "#logs/log.ts";
import { readLogList } from "#logs/read-logs.ts";
import { quantile } from "#metrics/distribution.ts";
import { latestRate } from "#metrics/intervals.ts";
import type { Metric, MetricSort } from "#metrics/metric.ts";
import { readMetricList, readMetricSeries } from "#metrics/read-metrics.ts";
import type { Series } from "#metrics/series.ts";
import { readServiceOperations, readServiceList } from "#services/read-services.ts";
import type { Attributes } from "#telemetry/attributes.ts";
import { readTraceList, readSpanContent, readTraceSpans } from "#traces/read-traces.ts";
import type { SpanContent } from "#traces/span.ts";
import { traceOutline } from "#traces/trace-outline.ts";
import type { Trace } from "#traces/trace.ts";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;
const MAX_TRACE_SPANS = 200;

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

const SEARCH_HELP =
  "Words match names, services, and IDs. " +
  "key=value, key!=value, and key>number (also >=, <, <=) match span, log, metric, " +
  "or resource attributes. " +
  "On traces, duration>500ms compares span durations.";

const BY_NAME: MetricSort = { column: "name", descending: false };

const Limit = z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT);

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function jsonResult(value: unknown) {
  return textResult(JSON.stringify(value, null, 1));
}

function attributeObject(attributes: Attributes) {
  return Object.fromEntries(attributes.map(({ key, value }) => [key, value]));
}

function isoTime(timeMs: number | null) {
  return timeMs === null ? null : new Date(timeMs).toISOString();
}

function descending<T>(column: T) {
  return { column, descending: true };
}

function isMetricNamed(metric: Metric, name: string, service: string | undefined) {
  return metric.name === name && (service === undefined || metric.service_name === service);
}

function traceSummary(trace: Trace) {
  return { ...trace, start_time: isoTime(trace.start_time) };
}

function spanSummary(content: SpanContent) {
  return {
    scope: { name: content.scope_name, version: content.scope_version },
    attributes: attributeObject(content.attributes),
    resource: attributeObject(content.resource_attributes),
    events: content.events.map((event) => ({
      name: event.name,
      offset_ms: event.offset_ms,
      attributes: attributeObject(event.attributes),
    })),
    links: content.links.map((link) => ({
      trace_id: link.trace_id,
      span_id: link.span_id,
      stored: link.has_trace,
      attributes: attributeObject(link.attributes),
    })),
  };
}

function metricSummary(metric: Metric) {
  return { ...metric, last_time: isoTime(metric.last_time) };
}

function logSummary(log: Log) {
  return {
    time: isoTime(log.time),
    severity: log.severity ?? log.severity_text,
    service: log.service_name,
    body: log.body,
    trace_id: log.trace_id,
    span_id: log.span_id,
    attributes: attributeObject(log.attributes),
  };
}

function seriesSummary(metric: Metric, series: Series) {
  const identity = {
    attributes: attributeObject(series.attributes),
    service: attributeObject(series.resource_attributes)["service.name"] ?? null,
    first_time: isoTime(series.first_time),
    last_time: isoTime(series.last_time),
  };
  if (series.stats.kind === "number") {
    const { value, min, max, latestPoints } = series.stats;
    if (metric.type === "counter") {
      return { ...identity, rate_per_second: latestRate(metric, latestPoints), total: value };
    }
    return { ...identity, last: value, min, max };
  }
  const { distribution } = series.stats;
  return {
    ...identity,
    count: distribution.count,
    sum: distribution.sum,
    min: distribution.min,
    max: distribution.max,
    p50: quantile(distribution, 0.5),
    p95: quantile(distribution, 0.95),
    p99: quantile(distribution, 0.99),
  };
}

export function registerTools(server: McpServer, connection: DuckDBConnection) {
  server.registerTool(
    "list_services",
    {
      title: "List services",
      description:
        "Services seen in the last 5 minutes, with request rate per second, error ratio, " +
        "and p50, p95, and p99 latency in milliseconds, from their server and consumer spans.",
      inputSchema: {
        search: z.string().default("").describe("Part of a service name"),
        sort: z.enum(["rate", "error_ratio", "p95_ms"]).default("rate"),
      },
      annotations: READ_ONLY,
    },
    async ({ search, sort }) => {
      const services = await readServiceList(connection, { search, sort: descending(sort) });
      return jsonResult(services);
    },
  );

  server.registerTool(
    "list_operations",
    {
      title: "List a service's operations",
      description:
        "A service's operations (server and consumer span names) in the last 5 minutes, " +
        "with rate per second, error ratio, and p50, p95, and p99 latency in milliseconds.",
      inputSchema: { service: z.string().describe("Service name, as list_services returns it") },
      annotations: READ_ONLY,
    },
    async ({ service }) => jsonResult(await readServiceOperations(connection, service)),
  );

  server.registerTool(
    "list_traces",
    {
      title: "List traces",
      description: `Traces whose root span arrived, newest or slowest first. ${SEARCH_HELP}`,
      inputSchema: {
        search: z.string().default(""),
        service: z.string().optional().describe("Only traces with a span from this service"),
        operation: z
          .string()
          .optional()
          .describe("With service: only traces with this server or consumer span name"),
        errors_only: z.boolean().default(false),
        sort: z
          .enum(["start_time", "duration_ms", "span_count", "error_count"])
          .default("start_time"),
        limit: Limit,
      },
      annotations: READ_ONLY,
    },
    async ({ search, service, operation, errors_only, sort, limit }) => {
      const traces = await readTraceList(connection, {
        search,
        errorsOnly: errors_only,
        serviceName: service,
        operationName: operation,
        timeRange: undefined,
        sort: descending(sort),
      });
      const shown = traces.slice(0, limit).map((trace) => traceSummary(trace));
      return jsonResult(shown);
    },
  );

  server.registerTool(
    "get_trace",
    {
      title: "Get a trace",
      description:
        "A trace's span tree: each span's name, service, kind, duration, " +
        "offset from the trace start, ID, and error status, with the critical path marked. " +
        "Large traces keep the critical path and the spans with errors. " +
        "Use get_span for a span's attributes, events, and links.",
      inputSchema: { trace_id: z.string() },
      annotations: READ_ONLY,
    },
    async ({ trace_id }) => {
      const spans = await readTraceSpans(connection, trace_id);
      if (spans.length === 0) {
        return textResult(`No spans stored for trace ${trace_id}`);
      }
      return textResult(traceOutline(trace_id, spans, MAX_TRACE_SPANS));
    },
  );

  server.registerTool(
    "get_span",
    {
      title: "Get a span",
      description: "A span's attributes, resource attributes, scope, events, and links.",
      inputSchema: { trace_id: z.string(), span_id: z.string() },
      annotations: READ_ONLY,
    },
    async ({ trace_id, span_id }) => {
      const content = await readSpanContent(connection, trace_id, span_id);
      if (content === null) {
        return textResult(`No span ${span_id} stored in trace ${trace_id}`);
      }
      return jsonResult(spanSummary(content));
    },
  );

  server.registerTool(
    "list_metrics",
    {
      title: "List metrics",
      description:
        "Metrics with their type, unit, service, description, series count, and last update. " +
        SEARCH_HELP,
      inputSchema: { search: z.string().default(""), limit: Limit },
      annotations: READ_ONLY,
    },
    async ({ search, limit }) => {
      const metrics = await readMetricList(connection, { search, sort: BY_NAME });
      const shown = metrics.slice(0, limit).map((metric) => metricSummary(metric));
      return jsonResult(shown);
    },
  );

  server.registerTool(
    "get_metric",
    {
      title: "Get a metric",
      description:
        "A metric's series with their attributes. " +
        "Counters give their latest rate per second and their total, " +
        "gauges and up-down counters their last value, min, and max, " +
        "and histograms their count, sum, min, max, and p50, p95, and p99.",
      inputSchema: {
        name: z.string().describe("Exact metric name"),
        service: z.string().optional(),
      },
      annotations: READ_ONLY,
    },
    async ({ name, service }) => {
      const candidates = await readMetricList(connection, { search: name, sort: BY_NAME });
      const metrics = candidates.filter((metric) => isMetricNamed(metric, name, service));
      if (metrics.length === 0) {
        const from = service === undefined ? "" : ` from ${service}`;
        return textResult(`No metric named ${name}${from}`);
      }
      const summaries = await Promise.all(
        metrics.map(async (metric) => {
          const series = await readMetricSeries(connection, metric);
          return {
            name: metric.name,
            type: metric.type,
            unit: metric.unit,
            service: metric.service_name,
            series: series.map((one) => seriesSummary(metric, one)),
          };
        }),
      );
      return jsonResult(summaries);
    },
  );

  server.registerTool(
    "list_logs",
    {
      title: "List logs",
      description:
        "Logs, newest first, with severity, service, body, attributes, and trace and span IDs. " +
        SEARCH_HELP,
      inputSchema: {
        search: z.string().default(""),
        min_severity: z.enum(["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"]).optional(),
        trace_id: z.string().optional(),
        span_id: z.string().optional(),
        limit: Limit,
      },
      annotations: READ_ONLY,
    },
    async ({ search, min_severity, trace_id, span_id, limit }) => {
      const logs = await readLogList(connection, {
        search,
        minSeverity: min_severity,
        traceId: trace_id,
        spanId: span_id,
        timeRange: undefined,
      });
      const shown = logs.slice(0, limit).map((log) => logSummary(log));
      return jsonResult(shown);
    },
  );
}
