import { DetailsHeader, Fact, Id, Meta, Title } from "#ui/details.tsx";
import { ServiceName } from "#ui/service-name.tsx";
import { THEME } from "#ui/theme.ts";
import { formatInteger } from "#utils/number.ts";
import { formatDuration, formatOffset } from "#utils/time.ts";

import { traceDuration } from "./span-tree.ts";
import type { Span } from "./span.ts";

const SHORT_ID_LENGTH = 8;

function errorCount(spans: Span[]) {
  return spans.filter((span) => span.is_error).length;
}

interface TraceCompareHeaderProps {
  beforeId: string;
  afterId: string;
  root: Span;
  before: Span[];
  after: Span[];
}

export function TraceCompareHeader({
  beforeId,
  afterId,
  root,
  before,
  after,
}: TraceCompareHeaderProps) {
  const beforeMs = traceDuration(before);
  const afterMs = traceDuration(after);
  const beforeErrors = errorCount(before);
  const afterErrors = errorCount(after);

  return (
    <>
      <DetailsHeader>
        <Title>{root.name}</Title>
        <Id>
          {beforeId.slice(0, SHORT_ID_LENGTH)} → {afterId.slice(0, SHORT_ID_LENGTH)}
        </Id>
      </DetailsHeader>
      <Meta>
        {root.service_name !== null && (
          <Fact>
            <ServiceName name={root.service_name} />
          </Fact>
        )}
        <Fact color={THEME.text}>
          {formatDuration(beforeMs)} → {formatDuration(afterMs)}
        </Fact>
        <Fact>{formatOffset(afterMs - beforeMs)}</Fact>
        <Fact>
          {formatInteger(before.length)} → {formatInteger(after.length)} spans
        </Fact>
        {beforeErrors + afterErrors > 0 && (
          <Fact color={THEME.textError}>
            {formatInteger(beforeErrors)} → {formatInteger(afterErrors)} errors
          </Fact>
        )}
      </Meta>
    </>
  );
}
