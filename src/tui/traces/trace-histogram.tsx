import { type BoxRenderable, TextAttributes } from "@opentui/core";
import { useRef, useState } from "react";

import { COLUMN_GAP } from "../columns.ts";
import { THEME } from "../theme.ts";
import { barRows, type HistogramColumn, type HistogramRange, overlaps } from "./histogram.ts";
import { hiddenTraces, TIME_SCALE_LABEL, timeAxis, timeColumns } from "./time-histogram.ts";

const PADDING_X = 1;
export const COLUMN_WIDTH = 2;

const BAR_HEIGHT = 4;
const TITLE_HEIGHT = 1;
const AXIS_HEIGHT = 1;
export const TRACE_HISTOGRAM_HEIGHT = TITLE_HEIGHT + BAR_HEIGHT + AXIS_HEIGHT;

const SEGMENT_COLORS = {
  ok: THEME.bar,
  error: THEME.textError,
};

function columnBackground(column: HistogramColumn, selected: HistogramRange | undefined) {
  return selected !== undefined && overlaps(column, selected)
    ? THEME.backgroundSelected
    : THEME.background;
}

interface TraceHistogramProps {
  occupied: HistogramColumn[];
  newestBucketMs: number;
  selected: HistogramRange | undefined;
}

export function TraceHistogram({ occupied, newestBucketMs, selected }: TraceHistogramProps) {
  const [width, setWidth] = useState(0);

  const histogramRef = useRef<BoxRenderable>(null);

  const columnCount = Math.max(0, Math.floor((width - 2 * PADDING_X) / COLUMN_WIDTH));
  const columns = timeColumns(occupied, newestBucketMs, columnCount, selected);
  const hidden = hiddenTraces(occupied, columns);
  const hasErrors = columns.some((column) => column.errorCount > 0);

  function renderChart() {
    if (occupied.length === 0 || columns.length === 0) {
      return null;
    }
    return (
      <>
        <box flexDirection="row" gap={COLUMN_GAP}>
          <text fg={THEME.textMuted} attributes={TextAttributes.BOLD} flexShrink={0}>
            Traces over time
          </text>
          {hasErrors && (
            <text fg={THEME.textError} flexShrink={0}>
              ■ errors
            </text>
          )}
          <text fg={THEME.textMuted} flexShrink={0}>
            {TIME_SCALE_LABEL}
          </text>
          {hidden.earlier && (
            <text fg={THEME.text} flexShrink={0}>
              ◀ earlier
            </text>
          )}
          {hidden.later && (
            <text fg={THEME.text} flexShrink={0}>
              later ▶
            </text>
          )}
        </box>
        {barRows(columns, BAR_HEIGHT).map((row, rowIndex) => (
          <text key={rowIndex} wrapMode="none">
            {row.map(({ column, cell }) => (
              <span
                key={column.from}
                fg={cell.foreground === undefined ? THEME.text : SEGMENT_COLORS[cell.foreground]}
                bg={
                  cell.background === undefined
                    ? columnBackground(column, selected)
                    : SEGMENT_COLORS[cell.background]
                }
              >
                {cell.glyph.repeat(COLUMN_WIDTH)}
              </span>
            ))}
          </text>
        ))}
        <text fg={THEME.textMuted} wrapMode="none">
          {timeAxis(columns, COLUMN_WIDTH)}
        </text>
      </>
    );
  }

  return (
    <box
      ref={histogramRef}
      paddingX={PADDING_X}
      onSizeChange={() => setWidth(histogramRef.current?.width ?? 0)}
    >
      {renderChart()}
    </box>
  );
}
