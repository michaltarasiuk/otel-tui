import { DetailsHeader, Id, Meta, Fact, Title } from "#tui/components/details.tsx";
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
          <Fact>
            <ServiceName name={root.service_name} />
          </Fact>
        )}
        <Fact>{formatTimeOfDay(startTime)}</Fact>
        <Fact>{formatCount(spans.length, "span")}</Fact>
        {errorCount > 0 && <Fact color={THEME.textError}>{formatCount(errorCount, "error")}</Fact>}
        <Fact>{formatDuration(durationMs)}</Fact>
      </Meta>
    </box>
  );
}
