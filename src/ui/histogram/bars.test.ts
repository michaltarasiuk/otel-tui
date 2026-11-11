import { expect, test } from "bun:test";

import { type BarCell, barRows, overlaps, stepSelection } from "./bars.ts";

function range(from: number, to: number) {
  return { from, to };
}

function bar(count: number, errorCount: number, maxCount: number, height: number) {
  const columns = [
    { from: 0, to: 1, count, errorCount },
    { from: 1, to: 2, count: maxCount, errorCount: 0 },
  ];
  return barRows(columns, height).map(([row]) => row?.cell);
}

const EMPTY_CELL = { glyph: " ", foreground: undefined, background: undefined } satisfies BarCell;

function ok(glyph: string) {
  return { glyph, foreground: "ok", background: undefined } satisfies BarCell;
}

function error(glyph: string) {
  return { glyph, foreground: "error", background: undefined } satisfies BarCell;
}

test("overlaps ranges that share more than an edge", () => {
  expect(overlaps({ from: 1, to: 5 }, { from: 4, to: 8 })).toBe(true);
  expect(overlaps({ from: 1, to: 5 }, { from: 5, to: 8 })).toBe(false);
  expect(overlaps({ from: 1, to: 5 }, { from: 0, to: 1 })).toBe(false);
});

test("selects the last occupied range first, then steps to the nearest one", () => {
  const occupied = [range(0, 1), range(2, 3), range(3, 4)];

  expect(stepSelection(occupied, undefined, 1)).toEqual({ from: 3, to: 4 });
  expect(stepSelection(occupied, undefined, -1)).toEqual({ from: 3, to: 4 });
  expect(stepSelection(occupied, { from: 3, to: 4 }, -1)).toEqual({ from: 2, to: 3 });
  expect(stepSelection(occupied, { from: 2, to: 3 }, -1)).toEqual({ from: 0, to: 1 });
  expect(stepSelection(occupied, { from: 0, to: 1 }, 1)).toEqual({ from: 2, to: 3 });
});

test("stays on the first or last occupied range at either end", () => {
  const occupied = [range(0, 1), range(1, 2)];

  expect(stepSelection(occupied, { from: 0, to: 1 }, -1)).toEqual({ from: 0, to: 1 });
  expect(stepSelection(occupied, { from: 1, to: 2 }, 1)).toEqual({ from: 1, to: 2 });
});

test("steps from an unoccupied selection to the nearest range on either side", () => {
  const occupied = [range(0, 1), range(5, 6)];
  const unoccupied = range(2, 3);

  expect(stepSelection(occupied, unoccupied, 1)).toEqual({ from: 5, to: 6 });
  expect(stepSelection(occupied, unoccupied, -1)).toEqual({ from: 0, to: 1 });
});

test("selects nothing when no range is occupied", () => {
  expect(stepSelection([], undefined, 1)).toBeUndefined();
  expect(stepSelection([], { from: 4, to: 5 }, 1)).toEqual({ from: 4, to: 5 });
});

test("selects only the range, not the counts of the column it came from", () => {
  const column = { from: 0, to: 1, count: 7, errorCount: 2 };

  expect(stepSelection([column], undefined, 1)).toEqual({ from: 0, to: 1 });
});

test("scales a bar against the tallest column in eighths of a cell", () => {
  expect(bar(10, 0, 10, 2)).toEqual([ok("█"), ok("█")]);
  expect(bar(5, 0, 10, 2)).toEqual([EMPTY_CELL, ok("█")]);
  expect(bar(3, 0, 8, 1)).toEqual([ok("▃")]);
});

test("draws a column with any traces at least one eighth tall", () => {
  expect(bar(1, 0, 1000, 2)).toEqual([EMPTY_CELL, ok("▁")]);
});

test("stacks errors under the other traces", () => {
  expect(bar(10, 5, 10, 2)).toEqual([ok("█"), error("█")]);
  expect(bar(10, 10, 10, 2)).toEqual([error("█"), error("█")]);
});

test("splits a full cell between errors below and other traces above", () => {
  expect(bar(10, 4, 10, 1)).toEqual([{ glyph: "▃", foreground: "error", background: "ok" }]);
});

test("colors a shared top cell as an error so a rare failure stays visible", () => {
  expect(bar(4, 1, 8, 1)).toEqual([error("▄")]);
});
