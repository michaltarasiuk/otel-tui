import type { SetStateAction } from "react";

import type { Span } from "#telemetry/traces/span.ts";
import { Rows } from "#tui/components/rows.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { Cell, Column, Row, Secondary, TableHeader } from "#tui/components/table.tsx";
import { COLUMN_SERVICE_WIDTH } from "#tui/theme/columns.ts";
import { THEME } from "#tui/theme/theme.ts";
import { formatDuration } from "#utils/format-duration.ts";

import { Scale, WaterfallBar } from "./waterfall.tsx";

const COLUMN_NAME_GROW = 2;
const COLUMN_DURATION_WIDTH = 8;
const COLUMN_TIMELINE_GROW = 3;

const INDENT_WIDTH = 2;

function indent(depth: number) {
  return " ".repeat(depth * INDENT_WIDTH);
}

interface SpanWaterfallProps {
  spans: Span[];
  selectedIndex: number;
  onSelect: (action: SetStateAction<number>) => void;
  traceDurationMs: number;
  hiddenCounts: ReadonlyMap<string, number>;
  criticalPath: ReadonlySet<string> | undefined;
}

export function SpanWaterfall({
  spans,
  selectedIndex,
  onSelect,
  traceDurationMs,
  hiddenCounts,
  criticalPath,
}: SpanWaterfallProps) {
  function nameColor(span: Span) {
    if (criticalPath !== undefined && !criticalPath.has(span.span_id)) {
      return THEME.textMuted;
    }
    return span.is_error ? THEME.textError : THEME.text;
  }

  return (
    <>
      <TableHeader>
        <Column width={COLUMN_SERVICE_WIDTH}>Service</Column>
        <Column grow={COLUMN_NAME_GROW}>Name</Column>
        <Column width={COLUMN_DURATION_WIDTH} align="right">
          Duration
        </Column>
        <Scale grow={COLUMN_TIMELINE_GROW} durationMs={traceDurationMs} />
      </TableHeader>
      <Rows
        items={spans}
        getKey={(span) => span.span_id}
        selectedIndex={selectedIndex}
        onSelect={(action) => onSelect(action)}
      >
        {(span) => {
          const hidden = hiddenCounts.get(span.span_id);
          return (
            <Row>
              <Cell width={COLUMN_SERVICE_WIDTH} muted>
                {span.service_name !== null && <ServiceName name={span.service_name} />}
              </Cell>
              <Cell grow={COLUMN_NAME_GROW} color={nameColor(span)}>
                {indent(span.depth)}
                {span.name}
                {hidden !== undefined && <Secondary> +{hidden}</Secondary>}
              </Cell>
              <Cell width={COLUMN_DURATION_WIDTH} align="right">
                {formatDuration(span.duration_ms)}
              </Cell>
              <WaterfallBar
                grow={COLUMN_TIMELINE_GROW}
                span={span}
                traceDurationMs={traceDurationMs}
                dimmed={criticalPath !== undefined && !criticalPath.has(span.span_id)}
              />
            </Row>
          );
        }}
      </Rows>
    </>
  );
}
