import { expect, test } from "bun:test";

import { RGBA } from "@opentui/core";

import { CHART_DOTS, render, textLines } from "#testing/render.tsx";

import { LineChart } from "./line-chart.tsx";

interface ChartLine {
  color: string;
  values: (number | null)[];
}

async function renderChart(lines: ChartLine[], { gapSlots = 1, includeZero = false } = {}) {
  const screen = await render(
    <LineChart
      height={2}
      includeZero={includeZero}
      startLabel="start"
      endLabel="end"
      formatValue={(value) => value.toFixed(1)}
      getLines={(slotCount) => ({
        lines: lines.map(({ color, values }) => ({ color, values: values.slice(0, slotCount) })),
        gapSlots,
      })}
    />,
    { width: 20, height: 4 },
  );
  const frame = await screen.waitForFrame(
    (frame) => CHART_DOTS.test(frame) || frame.includes("Not enough data"),
  );
  return { ...screen, rows: frame.split("\n").map((line) => line.trimEnd()) };
}

function line(values: (number | null)[]) {
  return { color: "#FF0000", values };
}

const SLOT_COUNT = 20;

const stepWithGap = [1, 1, 1, 1, ...Array<null>(8).fill(null), 3, 3, 3, 3];

test("draws a line in braille between labels for its highest and lowest values", async () => {
  await using chart = await renderChart([
    line(Array.from({ length: SLOT_COUNT }, (_, slot) => slot)),
  ]);

  expect(chart.rows.slice(0, 3)).toEqual([
    "     19.0      ⣀⣠⠴⠒⠋",
    "      0.0 ⣀⡤⠴⠚⠉⠁",
    "          start  end",
  ]);
});

test("breaks the line where values are missing for more than the gap slots", async () => {
  await using chart = await renderChart([line(stepWithGap)], {
    gapSlots: 2,
    includeZero: true,
  });

  expect(chart.rows.slice(0, 2)).toEqual(["      3.0       ⠉⠉", "      0.0 ⠒⠒"]);
});

test("joins the line across missing values within the gap slots", async () => {
  await using chart = await renderChart([line(stepWithGap)], {
    gapSlots: 10,
    includeZero: true,
  });

  expect(chart.rows.slice(0, 2)).toEqual(["      3.0    ⣀⡤⠖⠋⠉", "      0.0 ⠒⠒⠋⠁"]);
});

test("pads the range around a flat line", async () => {
  await using chart = await renderChart([line(Array.from({ length: SLOT_COUNT }, () => 4))]);

  expect(chart.rows.slice(0, 2)).toEqual(["      6.0", "      2.0 ⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉"]);
});

test("keeps a flat line at zero on the bottom when zero is included", async () => {
  await using chart = await renderChart([line(Array.from({ length: SLOT_COUNT }, () => 0))], {
    includeZero: true,
  });

  expect(chart.rows.slice(0, 2)).toEqual(["      1.0", "      0.0 ⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀"]);
});

test("says when there is nothing to plot yet", async () => {
  await using chart = await renderChart([line(Array.from({ length: SLOT_COUNT }, () => null))]);

  expect(textLines(chart.rows.join("\n")).join(" ")).toContain(
    "Not enough data points to plot yet",
  );
});

test("colors each line's dots", async () => {
  await using chart = await renderChart([
    { color: "#FF0000", values: [9, 9, 9, 9] },
    { color: "#0000FF", values: [null, null, null, null, null, null, 0, 0, 0, 0] },
  ]);

  const dotColors = chart
    .captureSpans()
    .lines.flatMap(({ spans }) => spans.filter((span) => CHART_DOTS.test(span.text)))
    .map((span) => span.fg);

  expect(dotColors).toEqual([RGBA.fromHex("#FF0000"), RGBA.fromHex("#0000FF")]);
});
