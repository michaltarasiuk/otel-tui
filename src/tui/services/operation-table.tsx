import type { SetStateAction } from "react";

import type { Operation } from "#telemetry/services/service.ts";
import { Description } from "#tui/components/details.tsx";
import { Rows } from "#tui/components/rows.tsx";
import { SPLIT_PADDING_X } from "#tui/components/split.tsx";
import { Cell, Column, Row, TableHeader } from "#tui/components/table.tsx";
import { THEME } from "#tui/theme/theme.ts";
import { formatDuration } from "#utils/format-duration.ts";
import { formatPercent } from "#utils/format-percent.ts";
import { formatRate } from "#utils/format-rate.ts";

import {
  COLUMN_DURATION_WIDTH,
  COLUMN_ERRORS_WIDTH,
  COLUMN_RATE_WIDTH,
  COLUMN_SPANS_WIDTH,
} from "./service-table.tsx";

interface OperationTableProps {
  operations: Operation[];
  failed: boolean;
  selectedIndex: number;
  onSelect: (action: SetStateAction<number>) => void;
}

export function OperationTable({
  operations,
  failed,
  selectedIndex,
  onSelect,
}: OperationTableProps) {
  if (failed) {
    return <Description color={THEME.textError}>Failed to load operations</Description>;
  }
  if (operations.length === 0) {
    return null;
  }

  return (
    <box flexGrow={1} flexBasis={0} marginX={-SPLIT_PADDING_X}>
      <TableHeader>
        <Column grow={1}>Operation</Column>
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
      <Rows
        items={operations}
        getKey={(operation) => operation.name}
        selectedIndex={selectedIndex}
        onSelect={(action) => onSelect(action)}
      >
        {(operation) => (
          <Row>
            <Cell grow={1}>{operation.name}</Cell>
            <Cell width={COLUMN_RATE_WIDTH} align="right">
              {formatRate(operation.rate)}
            </Cell>
            <Cell
              width={COLUMN_ERRORS_WIDTH}
              align="right"
              muted={operation.error_ratio === 0}
              color={operation.error_ratio > 0 ? THEME.textError : undefined}
            >
              {formatPercent(operation.error_ratio)}
            </Cell>
            <Cell width={COLUMN_DURATION_WIDTH} align="right">
              {formatDuration(operation.p50_ms)}
            </Cell>
            <Cell width={COLUMN_DURATION_WIDTH} align="right">
              {formatDuration(operation.p95_ms)}
            </Cell>
            <Cell width={COLUMN_DURATION_WIDTH} align="right">
              {formatDuration(operation.p99_ms)}
            </Cell>
            <Cell width={COLUMN_SPANS_WIDTH} align="right" muted>
              {operation.span_count.toLocaleString()}
            </Cell>
          </Row>
        )}
      </Rows>
    </box>
  );
}
