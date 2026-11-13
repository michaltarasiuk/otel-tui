import { MouseButton } from "@opentui/core";
import { useSuspenseQuery } from "@tanstack/react-query";

import { useConnection } from "#query/connection.ts";
import { COLUMN_TIME_WIDTH } from "#ui/columns.ts";
import { Description } from "#ui/details.tsx";
import { useFocusRequest } from "#ui/focus.tsx";
import { Section } from "#ui/section.tsx";
import { Cell, Row, SelectedContext } from "#ui/table.tsx";
import { THEME } from "#ui/theme.ts";
import { formatTime } from "#utils/time.ts";

import { seriesExemplarsQuery } from "./metric-queries.ts";
import { formatMetricValue } from "./metric-value.ts";
import type { Metric } from "./metric.ts";
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
  metric: Metric;
  seriesId: string;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function ExemplarList({ metric, seriesId, selectedIndex, onSelect }: ExemplarListProps) {
  const requestFocus = useFocusRequest();
  const connection = useConnection();
  const { data: exemplars, isError } = useSuspenseQuery(
    seriesExemplarsQuery(connection, metric, seriesId),
  );

  if (isError) {
    return <Description color={THEME.textError}>Failed to load exemplars</Description>;
  }
  if (exemplars.length === 0) {
    return null;
  }

  return (
    <Section title="Exemplars">
      {exemplars.map((exemplar, index) => (
        <box
          key={exemplar.exemplar_id}
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
                {formatTime(exemplar.time)}
              </Cell>
              <Cell width={COLUMN_VALUE_WIDTH} align="right">
                {formatMetricValue(exemplar.value, metric.unit)}
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
