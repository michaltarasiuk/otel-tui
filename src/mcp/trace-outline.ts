import { ancestorIds, criticalPath } from "#telemetry/traces/span-tree.ts";
import type { Span } from "#telemetry/traces/span.ts";
import { formatDuration, formatOffset } from "#utils/time.ts";

const INDENT = "  ";

function spanLine(span: Span, onCriticalPath: boolean) {
  return [
    `${onCriticalPath ? "*" : " "} ${INDENT.repeat(span.depth)}${span.name}`,
    `[${span.service_name ?? "unknown"}, ${span.kind}]`,
    formatDuration(span.duration_ms),
    `at ${formatOffset(span.offset_ms)}`,
    span.span_id,
    ...(span.is_error
      ? [`ERROR${span.status_message === null ? "" : `: ${span.status_message}`}`]
      : []),
  ].join(" ");
}

function keptSpans(spans: Span[], path: ReadonlySet<string>, maxSpans: number) {
  if (spans.length <= maxSpans) {
    return spans;
  }
  const kept = new Set(path);
  for (const span of spans) {
    if (span.is_error) {
      kept.add(span.span_id);
      for (const id of ancestorIds(spans, span.span_id)) {
        kept.add(id);
      }
    }
  }
  return spans.filter((span) => kept.has(span.span_id));
}

export function traceOutline(traceId: string, spans: Span[], maxSpans: number) {
  const path = criticalPath(spans);
  const shown = keptSpans(spans, path, maxSpans);
  const durationMs = spans.reduce(
    (end, span) => Math.max(end, span.offset_ms + span.duration_ms),
    0,
  );
  const errorCount = spans.filter((span) => span.is_error).length;

  const lines = [
    `trace ${traceId}: ${spans.length} spans, ${formatDuration(durationMs)}, ` +
      `${errorCount} with errors`,
    "* marks the critical path. Each line: name [service, kind] duration at +offset span_id",
    ...shown.map((span) => spanLine(span, path.has(span.span_id))),
  ];
  const hidden = spans.length - shown.length;
  if (hidden > 0) {
    lines.push(`${hidden} spans off the critical path and without errors are left out`);
  }
  return lines.join("\n");
}
