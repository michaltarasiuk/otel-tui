import type { BoxRenderable, ColorInput } from "@opentui/core";
import { useRef, useState } from "react";

import { THEME } from "../theme.ts";

const DOT_COLUMNS = 2;
const DOT_ROWS = 4;
const BRAILLE_BLANK = 0x2800;
const DOT_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];
const LABEL_WIDTH = 9;
const LABEL_GAP = 1;

interface ChartLine {
  color: ColorInput;
  values: (number | null)[];
}

interface Cell {
  bits: number;
  color: ColorInput | null;
}

function valueRange(lines: ChartLine[], includeZero: boolean) {
  const values = lines.flatMap((line) => line.values).filter((value) => value !== null);
  if (values.length === 0) {
    return null;
  }
  const low = includeZero ? Math.min(0, ...values) : Math.min(...values);
  const high = includeZero ? Math.max(0, ...values) : Math.max(...values);
  if (low !== high) {
    return { low, high };
  }
  const padding = Math.abs(high) / 2 || 1;
  return includeZero && low === 0
    ? { low, high: padding }
    : { low: low - padding, high: high + padding };
}

function plotCells(
  lines: ChartLine[],
  columns: number,
  rows: number,
  gapSlots: number,
  { low, high }: { low: number; high: number },
) {
  const cells: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => ({ bits: 0, color: null })),
  );
  const dotRowCount = rows * DOT_ROWS;

  function toDotRow(value: number) {
    return Math.round(((high - value) / (high - low)) * (dotRowCount - 1));
  }

  function setDot(x: number, y: number, color: ColorInput) {
    const cell = cells[Math.floor(y / DOT_ROWS)]?.[Math.floor(x / DOT_COLUMNS)];
    if (cell !== undefined) {
      cell.bits |= DOT_BITS[y % DOT_ROWS]![x % DOT_COLUMNS]!;
      cell.color = color;
    }
  }

  for (const { color, values } of lines) {
    let previous: { x: number; y: number } | null = null;
    for (const [x, value] of values.entries()) {
      if (value === null) {
        continue;
      }
      const y = toDotRow(value);
      if (previous === null || x - previous.x > gapSlots) {
        setDot(x, y, color);
      } else {
        let lastY = previous.y;
        for (let stepX = previous.x + 1; stepX <= x; stepX++) {
          const stepY = Math.round(
            previous.y + ((y - previous.y) * (stepX - previous.x)) / (x - previous.x),
          );
          for (let fillY = Math.min(lastY, stepY); fillY <= Math.max(lastY, stepY); fillY++) {
            setDot(stepX, fillY, color);
          }
          lastY = stepY;
        }
      }
      previous = { x, y };
    }
  }
  return cells;
}

function toRuns(row: Cell[]) {
  const runs: { color: ColorInput | null; text: string }[] = [];
  for (const { bits, color } of row) {
    const char = bits === 0 ? " " : String.fromCharCode(BRAILLE_BLANK + bits);
    const last = runs.at(-1);
    if (last !== undefined && last.color === color) {
      last.text += char;
    } else {
      runs.push({ color, text: char });
    }
  }
  return runs;
}

interface LineChartProps {
  height: number;
  includeZero: boolean;
  startLabel: string;
  endLabel: string;
  formatValue: (value: number) => string;
  getLines: (slotCount: number) => { lines: ChartLine[]; gapSlots: number };
}

export function LineChart({
  height,
  includeZero,
  startLabel,
  endLabel,
  formatValue,
  getLines,
}: LineChartProps) {
  const [width, setWidth] = useState(0);

  const chartRef = useRef<BoxRenderable>(null);

  const columns = Math.max(0, width - LABEL_WIDTH - LABEL_GAP);

  function renderPlot() {
    if (columns === 0) {
      return null;
    }
    const { lines, gapSlots } = getLines(columns * DOT_COLUMNS);
    const range = valueRange(lines, includeZero);
    if (range === null) {
      return (
        <box flexGrow={1} justifyContent="center" alignItems="center">
          <text fg={THEME.textMuted}>Not enough data points to plot yet</text>
        </box>
      );
    }

    const lastRow = height - 1;
    return plotCells(lines, columns, height, gapSlots, range).map((row, rowIndex) => (
      <box key={rowIndex} flexDirection="row" gap={LABEL_GAP}>
        <text
          width={LABEL_WIDTH}
          flexShrink={0}
          fg={THEME.textMuted}
          textAlign="right"
          wrapMode="none"
          truncate
        >
          {rowIndex === 0 && formatValue(range.high)}
          {rowIndex === lastRow && formatValue(range.low)}
        </text>
        <text wrapMode="none">
          {toRuns(row).map((run, runIndex) => (
            <span key={runIndex} fg={run.color ?? THEME.textMuted}>
              {run.text}
            </span>
          ))}
        </text>
      </box>
    ));
  }

  return (
    <box ref={chartRef} onSizeChange={() => setWidth(chartRef.current?.width ?? 0)}>
      <box height={height}>{renderPlot()}</box>
      <box flexDirection="row" justifyContent="space-between" paddingLeft={LABEL_WIDTH + LABEL_GAP}>
        <text fg={THEME.textMuted}>{startLabel}</text>
        <text fg={THEME.textMuted}>{endLabel}</text>
      </box>
    </box>
  );
}
