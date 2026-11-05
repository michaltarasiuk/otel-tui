import { clamp } from "#utils/clamp.ts";

const LOWER_BLOCKS = "▁▂▃▄▅▆▇█";
const EIGHTHS_PER_CELL = LOWER_BLOCKS.length;

export interface HistogramRange {
  from: number;
  to: number;
}

export interface HistogramColumn extends HistogramRange {
  traceCount: number;
  errorCount: number;
}

type Segment = "ok" | "error";

export interface BarCell {
  glyph: string;
  foreground: Segment | undefined;
  background: Segment | undefined;
}

export function overlaps(a: HistogramRange, b: HistogramRange) {
  return a.from < b.to && b.from < a.to;
}

export function stepSelection(
  occupied: HistogramRange[],
  selected: HistogramRange | undefined,
  step: 1 | -1,
) {
  let next: HistogramRange | undefined;
  if (selected === undefined) {
    next = occupied.at(-1);
  } else if (step === 1) {
    next = occupied.find((range) => range.from >= selected.to);
  } else {
    next = occupied.findLast((range) => range.to <= selected.from);
  }
  return next === undefined ? selected : { from: next.from, to: next.to };
}

function eighthsOf(count: number, maxCount: number, capacity: number) {
  return count === 0 ? 0 : Math.max(1, Math.round((count / maxCount) * capacity));
}

function barCell(row: number, totalEighths: number, errorEighths: number): BarCell {
  const floor = row * EIGHTHS_PER_CELL;
  const filled = Math.min(totalEighths - floor, EIGHTHS_PER_CELL);
  if (filled <= 0) {
    return { glyph: " ", foreground: undefined, background: undefined };
  }

  const errorFilled = clamp(errorEighths - floor, 0, EIGHTHS_PER_CELL);
  const glyph = LOWER_BLOCKS[filled - 1] ?? " ";

  if (filled < EIGHTHS_PER_CELL) {
    return { glyph, foreground: errorFilled > 0 ? "error" : "ok", background: undefined };
  }
  if (errorFilled === 0) {
    return { glyph, foreground: "ok", background: undefined };
  }
  if (errorFilled === EIGHTHS_PER_CELL) {
    return { glyph, foreground: "error", background: undefined };
  }
  return { glyph: LOWER_BLOCKS[errorFilled - 1] ?? " ", foreground: "error", background: "ok" };
}

export function barRows(columns: HistogramColumn[], height: number) {
  const maxCount = Math.max(...columns.map(({ traceCount }) => traceCount));
  const capacity = height * EIGHTHS_PER_CELL;
  const bars = columns.map((column) => {
    const totalEighths = eighthsOf(column.traceCount, maxCount, capacity);
    const errorEighths = Math.min(totalEighths, eighthsOf(column.errorCount, maxCount, capacity));
    return { column, totalEighths, errorEighths };
  });

  return Array.from({ length: height }, (_, fromTop) =>
    bars.map(({ column, totalEighths, errorEighths }) => ({
      column,
      cell: barCell(height - 1 - fromTop, totalEighths, errorEighths),
    })),
  );
}
