import { Rows } from "#ui/rows.tsx";
import { ServiceName } from "#ui/service-name.tsx";
import { Cell, Column, Row, Secondary, TableHeader } from "#ui/table.tsx";
import { THEME } from "#ui/theme.ts";
import type { Selection } from "#ui/use-selection.ts";
import { formatInteger, formatPercent, formatRate } from "#utils/number.ts";
import { indent } from "#utils/text.ts";
import { formatDuration } from "#utils/time.ts";

import type { MapNode } from "./service-map.ts";
import {
  COLUMN_DURATION_WIDTH,
  COLUMN_ERRORS_WIDTH,
  COLUMN_RATE_WIDTH,
  COLUMN_SPANS_WIDTH,
} from "./service-table.tsx";

interface ServiceMapTableProps {
  nodes: MapNode[];
  selection: Selection<MapNode>;
}

export function ServiceMapTable({ nodes, selection }: ServiceMapTableProps) {
  return (
    <>
      <TableHeader>
        <Column grow={1}>Service</Column>
        <Column width={COLUMN_RATE_WIDTH} align="right">
          Rate
        </Column>
        <Column width={COLUMN_ERRORS_WIDTH} align="right">
          Errors
        </Column>
        <Column width={COLUMN_DURATION_WIDTH} align="right">
          p50
        </Column>
        <Column width={COLUMN_DURATION_WIDTH} align="right">
          p95
        </Column>
        <Column width={COLUMN_DURATION_WIDTH} align="right">
          p99
        </Column>
        <Column width={COLUMN_SPANS_WIDTH} align="right">
          Spans
        </Column>
      </TableHeader>
      <Rows items={nodes} selection={selection}>
        {({ depth, name, call, isCycle }) => (
          <Row>
            <Cell grow={1}>
              {indent(depth)}
              {call?.is_external === true ? (
                <Secondary>○ {name}</Secondary>
              ) : (
                <ServiceName name={name} />
              )}
              {isCycle && <Secondary> ↻</Secondary>}
            </Cell>
            <Cell width={COLUMN_RATE_WIDTH} align="right">
              {call === undefined ? "" : formatRate(call.rate)}
            </Cell>
            <Cell
              width={COLUMN_ERRORS_WIDTH}
              align="right"
              muted={call?.error_ratio === 0}
              color={call !== undefined && call.error_ratio > 0 ? THEME.textError : undefined}
            >
              {call === undefined ? "" : formatPercent(call.error_ratio)}
            </Cell>
            <Cell width={COLUMN_DURATION_WIDTH} align="right">
              {call === undefined ? "" : formatDuration(call.p50_ms)}
            </Cell>
            <Cell width={COLUMN_DURATION_WIDTH} align="right">
              {call === undefined ? "" : formatDuration(call.p95_ms)}
            </Cell>
            <Cell width={COLUMN_DURATION_WIDTH} align="right">
              {call === undefined ? "" : formatDuration(call.p99_ms)}
            </Cell>
            <Cell width={COLUMN_SPANS_WIDTH} align="right" muted>
              {call === undefined ? "" : formatInteger(call.span_count)}
            </Cell>
          </Row>
        )}
      </Rows>
    </>
  );
}
