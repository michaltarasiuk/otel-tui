export type SpanKind = "unspecified" | "internal" | "server" | "client" | "producer" | "consumer";

export type SpanStatus = { code: "unset" } | { code: "ok" } | { code: "error"; message: string };

export type AttributeValue = string | number | boolean;

export interface SpanEvent {
  name: string;
  offsetMs: number;
  attributes: Record<string, AttributeValue>;
}

export interface Span {
  spanId: string;
  parentSpanId: string | undefined;
  name: string;
  service: string;
  kind: SpanKind;
  offsetMs: number;
  durationMs: number;
  status: SpanStatus;
  attributes: Record<string, AttributeValue>;
  resource: Record<string, AttributeValue>;
  events: SpanEvent[];
}

export interface Trace {
  traceId: string;
  startTime: number;
  spans: Span[];
}

export interface TraceSummary {
  traceId: string;
  startTime: number;
  rootName: string;
  service: string;
  spanCount: number;
  durationMs: number;
  errorCount: number;
}

// Spans whose parent hasn't arrived, or isn't exported to this receiver, act as roots.
export function rootSpans(trace: Trace) {
  const spanIds = new Set(trace.spans.map((span) => span.spanId));
  return trace.spans
    .filter((span) => span.parentSpanId === undefined || !spanIds.has(span.parentSpanId))
    .toSorted((a, b) => a.offsetMs - b.offsetMs);
}

export function traceDuration(trace: Trace) {
  return Math.max(...trace.spans.map((span) => span.offsetMs + span.durationMs));
}

export function errorCount(trace: Trace) {
  return trace.spans.filter((span) => span.status.code === "error").length;
}

export function summarizeTrace(trace: Trace) {
  const [root] = rootSpans(trace);
  if (root === undefined) {
    throw new Error(`Trace ${trace.traceId} has no spans`);
  }
  return {
    traceId: trace.traceId,
    startTime: trace.startTime,
    rootName: root.name,
    service: root.service,
    spanCount: trace.spans.length,
    durationMs: traceDuration(trace),
    errorCount: errorCount(trace),
  };
}
