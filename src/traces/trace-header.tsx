import { DetailsHeader, Id, Meta, Fact, Title } from "#ui/details.tsx";
import { ServiceName } from "#ui/service-name.tsx";
import { THEME } from "#ui/theme.ts";
import { formatCount, formatShownCount } from "#utils/number.ts";
import { formatDuration, formatTime } from "#utils/time.ts";

import type { Span } from "./span.ts";

interface TraceHeaderProps {
  traceId: string;
  root: Span;
  spans: Span[];
  matchCount: number | undefined;
  durationMs: number;
}

export function TraceHeader({ traceId, root, spans, matchCount, durationMs }: TraceHeaderProps) {
  const errorCount = spans.filter((span) => span.is_error).length;
  const startTime = spans.reduce(
    (start, span) => Math.min(start, span.start_time),
    root.start_time,
  );

  return (
    <>
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
        <Fact>{formatTime(startTime)}</Fact>
        <Fact>{formatShownCount(matchCount ?? spans.length, spans.length, "span")}</Fact>
        {errorCount > 0 && <Fact color={THEME.textError}>{formatCount(errorCount, "error")}</Fact>}
        <Fact>{formatDuration(durationMs)}</Fact>
      </Meta>
    </>
  );
}
