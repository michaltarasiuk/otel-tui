import type { SetStateAction } from "react";

import type { Trace, TraceSort } from "#telemetry/traces/trace.ts";
import { Rows } from "#tui/components/rows.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { Cell, Column, Row, sortDirection, TableHeader } from "#tui/components/table.tsx";
import {
  COLUMN_SERVICE_WIDTH,
  COLUMN_SORT_ARROW_WIDTH,
  COLUMN_TIME_WIDTH,
} from "#tui/theme/columns.ts";
import { THEME } from "#tui/theme/theme.ts";
import { formatDuration } from "#utils/format-duration.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";

const COLUMN_SPANS_WIDTH = 5 + COLUMN_SORT_ARROW_WIDTH;
const COLUMN_ERRORS_WIDTH = 6 + COLUMN_SORT_ARROW_WIDTH;
const COLUMN_DURATION_WIDTH = 8 + COLUMN_SORT_ARROW_WIDTH;

interface TraceTableProps {
  traces: Trace[];
  selectedIndex: number;
  onSelect: (action: SetStateAction<number>) => void;
  sort: TraceSort;
}

export function TraceTable({ traces, selectedIndex, onSelect, sort }: TraceTableProps) {
  return (
    <>
      <TableHeader>
        <Column width={COLUMN_TIME_WIDTH} sort={sortDirection(sort, "start_time")}>
          Time
        </Column>
        <Column width={COLUMN_SERVICE_WIDTH}>Service</Column>
        <Column grow={1}>Name</Column>
        <Column width={COLUMN_SPANS_WIDTH} align="right" sort={sortDirection(sort, "span_count")}>
          Spans
        </Column>
        <Column width={COLUMN_ERRORS_WIDTH} align="right" sort={sortDirection(sort, "error_count")}>
          Errors
        </Column>
        <Column
          width={COLUMN_DURATION_WIDTH}
          align="right"
          sort={sortDirection(sort, "duration_ms")}
        >
          Duration
        </Column>
      </TableHeader>
      <Rows
        items={traces}
        getKey={(trace) => trace.trace_id}
        selectedIndex={selectedIndex}
        onSelect={(action) => onSelect(action)}
        halfPageKeys
      >
        {(trace) => (
          <Row>
            <Cell width={COLUMN_TIME_WIDTH} muted>
              {formatTimeOfDay(trace.start_time)}
            </Cell>
            <Cell width={COLUMN_SERVICE_WIDTH} muted>
              {trace.service_name !== null && <ServiceName name={trace.service_name} />}
            </Cell>
            <Cell grow={1}>{trace.name}</Cell>
            <Cell width={COLUMN_SPANS_WIDTH} align="right" muted>
              {trace.span_count}
            </Cell>
            <Cell width={COLUMN_ERRORS_WIDTH} align="right" color={THEME.textError}>
              {trace.error_count > 0 && trace.error_count}
            </Cell>
            <Cell width={COLUMN_DURATION_WIDTH} align="right">
              {formatDuration(trace.duration_ms)}
            </Cell>
          </Row>
        )}
      </Rows>
    </>
  );
}
