import { COLUMN_SERVICE_WIDTH } from "#ui/columns.ts";
import { DeltaBar, DeltaScale } from "#ui/delta-bar.tsx";
import { Rows } from "#ui/rows.tsx";
import { ServiceName } from "#ui/service-name.tsx";
import { Cell, Column, Row, TableHeader } from "#ui/table.tsx";
import type { Selection } from "#ui/use-selection.ts";
import { formatDuration, formatOffset } from "#utils/time.ts";

import type { OperationDiff } from "./span-diff.ts";

const COLUMN_NAME_GROW = 3;
const COLUMN_COUNT_WIDTH = 11;
const COLUMN_DURATION_WIDTH = 8;
const COLUMN_CHANGE_WIDTH = 9;
const COLUMN_BAR_GROW = 2;

function timeDelta(operation: OperationDiff) {
  return operation.afterMs - operation.beforeMs;
}

interface OperationDiffTableProps {
  operations: OperationDiff[];
  selection: Selection<OperationDiff>;
}

export function OperationDiffTable({ operations, selection }: OperationDiffTableProps) {
  const maxDeltaMs = operations.reduce(
    (max, operation) => Math.max(max, Math.abs(timeDelta(operation))),
    0,
  );

  return (
    <>
      <TableHeader>
        <Column width={COLUMN_SERVICE_WIDTH}>Service</Column>
        <Column grow={COLUMN_NAME_GROW}>Operation</Column>
        <Column width={COLUMN_COUNT_WIDTH} align="right">
          Spans
        </Column>
        <Column width={COLUMN_DURATION_WIDTH} align="right">
          Before
        </Column>
        <Column width={COLUMN_DURATION_WIDTH} align="right">
          After
        </Column>
        <Column width={COLUMN_CHANGE_WIDTH} align="right">
          Change
        </Column>
        <DeltaScale grow={COLUMN_BAR_GROW} maxDeltaMs={maxDeltaMs} />
      </TableHeader>
      <Rows items={operations} selection={selection}>
        {(operation) => (
          <Row>
            <Cell width={COLUMN_SERVICE_WIDTH} muted>
              {operation.serviceName !== null && <ServiceName name={operation.serviceName} />}
            </Cell>
            <Cell grow={COLUMN_NAME_GROW}>{operation.name}</Cell>
            <Cell width={COLUMN_COUNT_WIDTH} align="right" muted>
              {operation.beforeCount} → {operation.afterCount}
            </Cell>
            <Cell width={COLUMN_DURATION_WIDTH} align="right">
              {formatDuration(operation.beforeMs)}
            </Cell>
            <Cell width={COLUMN_DURATION_WIDTH} align="right">
              {formatDuration(operation.afterMs)}
            </Cell>
            <Cell width={COLUMN_CHANGE_WIDTH} align="right">
              {formatOffset(timeDelta(operation))}
            </Cell>
            <DeltaBar
              grow={COLUMN_BAR_GROW}
              deltaMs={timeDelta(operation)}
              maxDeltaMs={maxDeltaMs}
            />
          </Row>
        )}
      </Rows>
    </>
  );
}
