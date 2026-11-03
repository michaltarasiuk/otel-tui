import { formatCount } from "../../utils/text.ts";
import { formatDuration, formatTime } from "../../utils/time.ts";
import { Facts, Heading } from "../heading.tsx";
import { ServiceName } from "../service-name.tsx";
import { THEME } from "../theme.ts";
import type { Span } from "./span.ts";

interface TraceHeaderProps {
  traceId: string;
  root: Span;
  spans: Span[];
  durationMs: number;
}

export function TraceHeader({ traceId, root, spans, durationMs }: TraceHeaderProps) {
  const errorCount = spans.filter((span) => span.is_error).length;
  const startTime = spans.reduce(
    (start, span) => Math.min(start, span.start_time),
    root.start_time,
  );

  return (
    <box paddingX={1}>
      <Heading title={root.name} aside={traceId} />
      <Facts>
        {root.service_name !== null && (
          <text fg={THEME.textMuted} wrapMode="none" flexShrink={0}>
            <ServiceName name={root.service_name} />
          </text>
        )}
        <text fg={THEME.textMuted} flexShrink={0}>
          {formatTime(startTime)}
        </text>
        <text fg={THEME.textMuted} flexShrink={0}>
          {formatCount(spans.length, "span")}
        </text>
        {errorCount > 0 && (
          <text fg={THEME.textError} flexShrink={0}>
            {formatCount(errorCount, "error")}
          </text>
        )}
        <text fg={THEME.textMuted} flexShrink={0}>
          {formatDuration(durationMs)}
        </text>
      </Facts>
    </box>
  );
}
