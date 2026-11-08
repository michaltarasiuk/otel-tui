import { DetailsHeader, Id, Meta, Muted, Title } from "#tui/components/details.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { THEME } from "#tui/theme/theme.ts";
import { formatCount } from "#utils/format-count.ts";
import { formatDuration } from "#utils/format-duration.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";

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
      <DetailsHeader>
        <Title>{root.name}</Title>
        <Id>{traceId}</Id>
      </DetailsHeader>
      <Meta>
        {root.service_name !== null && (
          <Muted>
            <ServiceName name={root.service_name} />
          </Muted>
        )}
        <Muted>{formatTimeOfDay(startTime)}</Muted>
        <Muted>{formatCount(spans.length, "span")}</Muted>
        {errorCount > 0 && (
          <Muted color={THEME.textError}>{formatCount(errorCount, "error")}</Muted>
        )}
        <Muted>{formatDuration(durationMs)}</Muted>
      </Meta>
    </box>
  );
}
