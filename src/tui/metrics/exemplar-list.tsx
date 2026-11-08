import { MouseButton } from "@opentui/core";

import { Description } from "#tui/components/details.tsx";
import { useFocusRequest } from "#tui/components/focus.tsx";
import { Section } from "#tui/components/section.tsx";
import { Cell, Row, SelectedContext } from "#tui/components/table.tsx";
import { COLUMN_TIME_WIDTH } from "#tui/theme/columns.ts";
import { THEME } from "#tui/theme/theme.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";

import { formatMetricValue } from "./metric-value.ts";
import type { Exemplar } from "./series.ts";

const COLUMN_VALUE_WIDTH = 10;

function traceLabel({ trace_id, span_id, has_trace }: Exemplar) {
  if (trace_id === null) {
    return "no trace";
  }
  const ids = `${trace_id} ${span_id ?? ""}`.trim();
  return has_trace ? ids : `${ids} (not stored)`;
}

interface ExemplarListProps {
  exemplars: Exemplar[];
  failed: boolean;
  unit: string;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function ExemplarList({
  exemplars,
  failed,
  unit,
  selectedIndex,
  onSelect,
}: ExemplarListProps) {
  const requestFocus = useFocusRequest();

  if (failed) {
    return <Description color={THEME.textError}>Failed to load exemplars</Description>;
  }
  if (exemplars.length === 0) {
    return null;
  }

  return (
    <Section title="Exemplars">
      {exemplars.map((exemplar, index) => (
        <box
          key={index}
          onMouseDown={(event) => {
            if (event.button === MouseButton.LEFT) {
              requestFocus();
              onSelect(index);
            }
          }}
        >
          <SelectedContext value={index === selectedIndex}>
            <Row>
              <Cell width={COLUMN_TIME_WIDTH} muted>
                {formatTimeOfDay(exemplar.time)}
              </Cell>
              <Cell width={COLUMN_VALUE_WIDTH} align="right">
                {formatMetricValue(exemplar.value, unit)}
              </Cell>
              <Cell grow={1} muted={!exemplar.has_trace}>
                {traceLabel(exemplar)}
              </Cell>
            </Row>
          </SelectedContext>
        </box>
      ))}
    </Section>
  );
}
