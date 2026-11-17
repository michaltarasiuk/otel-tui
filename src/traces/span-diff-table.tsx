import { COLUMN_SERVICE_WIDTH } from "#ui/columns.ts";
import { DeltaBar, DeltaScale } from "#ui/delta-bar.tsx";
import { Rows } from "#ui/rows.tsx";
import { ServiceName } from "#ui/service-name.tsx";
import { Cell, Column, Row, TableHeader } from "#ui/table.tsx";
import { THEME } from "#ui/theme.ts";
import type { Selection } from "#ui/use-selection.ts";
import { indent } from "#utils/text.ts";
import { formatDuration, formatOffset } from "#utils/time.ts";

import { durationDelta, type SpanDiff } from "./span-diff.ts";
import type { Span } from "./span.ts";

const COLUMN_NAME_GROW = 3;
const COLUMN_DURATION_WIDTH = 8;
const COLUMN_CHANGE_WIDTH = 9;
const COLUMN_BAR_GROW = 2;

function change(row: SpanDiff) {
  if (row.before === undefined) {
    return "added";
  }
  if (row.after === undefined) {
    return "removed";
  }
  return formatOffset(durationDelta(row));
}

function isError({ before, after }: SpanDiff) {
  return (before?.is_error ?? false) || (after?.is_error ?? false);
}

interface DurationCellProps {
  span: Span | undefined;
}

function DurationCell({ span }: DurationCellProps) {
  return (
    <Cell width={COLUMN_DURATION_WIDTH} align="right" muted={span === undefined}>
      {span === undefined ? "-" : formatDuration(span.duration_ms)}
    </Cell>
  );
}

interface SpanDiffTableProps {
  rows: SpanDiff[];
  selection: Selection<SpanDiff>;
}

export function SpanDiffTable({ rows, selection }: SpanDiffTableProps) {
  const maxDeltaMs = rows.reduce((max, row) => Math.max(max, Math.abs(durationDelta(row))), 0);

  return (
    <>
      <TableHeader>
        <Column width={COLUMN_SERVICE_WIDTH}>Service</Column>
        <Column grow={COLUMN_NAME_GROW}>Name</Column>
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
      <Rows items={rows} selection={selection}>
        {(row) => (
          <Row>
            <Cell width={COLUMN_SERVICE_WIDTH} muted>
              {row.serviceName !== null && <ServiceName name={row.serviceName} />}
            </Cell>
            <Cell grow={COLUMN_NAME_GROW} color={isError(row) ? THEME.textError : THEME.text}>
              {indent(row.depth)}
              {row.name}
            </Cell>
            <DurationCell span={row.before} />
            <DurationCell span={row.after} />
            <Cell width={COLUMN_CHANGE_WIDTH} align="right">
              {change(row)}
            </Cell>
            <DeltaBar grow={COLUMN_BAR_GROW} deltaMs={durationDelta(row)} maxDeltaMs={maxDeltaMs} />
          </Row>
        )}
      </Rows>
    </>
  );
}
