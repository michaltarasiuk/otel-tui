import { type BoxRenderable, TextAttributes } from "@opentui/core";
import { useRef, useState } from "react";

import { COLUMN_GAP } from "#ui/columns.ts";
import { THEME } from "#ui/theme.ts";

import { barRows, type HistogramColumn, type HistogramRange, overlaps } from "./bars.ts";
import { hiddenColumns, TIME_SCALE_LABEL, timeAxis, timeColumns } from "./time-columns.ts";

const HISTOGRAM_PADDING_X = 1;
export const HISTOGRAM_COLUMN_WIDTH = 2;

const HISTOGRAM_BAR_HEIGHT = 4;
const HISTOGRAM_TITLE_HEIGHT = 1;
const HISTOGRAM_AXIS_HEIGHT = 1;
export const HISTOGRAM_HEIGHT =
  HISTOGRAM_TITLE_HEIGHT + HISTOGRAM_BAR_HEIGHT + HISTOGRAM_AXIS_HEIGHT;

const SEGMENT_COLORS = { ok: THEME.bar, error: THEME.textError };

function columnBackground(column: HistogramColumn, selected: HistogramRange | undefined) {
  return selected !== undefined && overlaps(column, selected)
    ? THEME.backgroundSelected
    : THEME.background;
}

interface TimeHistogramProps {
  title: string;
  occupied: HistogramColumn[];
  newestBucketMs: number;
  selected: HistogramRange | undefined;
}

export function TimeHistogram({ title, occupied, newestBucketMs, selected }: TimeHistogramProps) {
  const [width, setWidth] = useState(0);

  const columnCount = Math.max(
    0,
    Math.floor((width - 2 * HISTOGRAM_PADDING_X) / HISTOGRAM_COLUMN_WIDTH),
  );
  const columns = timeColumns(occupied, newestBucketMs, columnCount, selected);
  const hidden = hiddenColumns(occupied, columns);
  const hasErrors = columns.some((column) => column.errorCount > 0);

  function renderChart() {
    if (occupied.length === 0 || columns.length === 0) {
      return null;
    }
    return (
      <>
        <box flexDirection="row" gap={COLUMN_GAP}>
          <text fg={THEME.textMuted} attributes={TextAttributes.BOLD} flexShrink={0}>
            {title}
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
        {barRows(columns, HISTOGRAM_BAR_HEIGHT).map((row, rowIndex) => (
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
                {cell.glyph.repeat(HISTOGRAM_COLUMN_WIDTH)}
              </span>
            ))}
          </text>
        ))}
        <text fg={THEME.textMuted} wrapMode="none">
          {timeAxis(columns, HISTOGRAM_COLUMN_WIDTH)}
        </text>
      </>
    );
  }

  const histogramRef = useRef<BoxRenderable>(null);

  return (
    <box
      ref={histogramRef}
      paddingX={HISTOGRAM_PADDING_X}
      onSizeChange={() => setWidth(histogramRef.current?.width ?? 0)}
    >
      {renderChart()}
    </box>
  );
}
