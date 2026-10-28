import { expect, test } from "bun:test";

import { render } from "../../testing/render.tsx";
import { BucketBars } from "./bucket-bars.tsx";
import { type Distribution, explicitBuckets, exponentialBuckets } from "./distribution.ts";

const BAR_COLUMNS = 20;
const LABEL_AND_COUNT_COLUMNS = 24;
const SIZE = { width: BAR_COLUMNS + LABEL_AND_COUNT_COLUMNS, height: 20 };

function withBuckets(buckets: Distribution["buckets"]): Distribution {
  return { count: 0, sum: null, min: null, max: null, buckets };
}

async function renderBars(distribution: Distribution, unit: string) {
  const screen = await render(
    <BucketBars distribution={distribution} unit={unit} color="#00FF00" />,
    SIZE,
  );
  const frame = await screen.waitForFrame((frame) => frame.includes("■".repeat(BAR_COLUMNS)));
  return {
    ...screen,
    rows: frame
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line !== ""),
  };
}

test("scales each bar to the fullest bucket and drops empty buckets at the edges", async () => {
  await using bars = await renderBars(
    withBuckets(explicitBuckets([10, 50, 100, 500], [0, 1, 4, 2, 0])),
    "ms",
  );

  expect(bars.rows).toEqual([
    "≤ 50.0ms     ■■■■■                         1",
    "≤ 100.0ms    ■■■■■■■■■■■■■■■■■■■■          4",
    "≤ 500.0ms    ■■■■■■■■■■                    2",
  ]);
});

test("keeps empty buckets between others and labels the overflow bucket by its lower bound", async () => {
  await using bars = await renderBars(withBuckets(explicitBuckets([10, 50], [3, 0, 6])), "ms");

  expect(bars.rows).toEqual([
    "≤ 10.0ms     ■■■■■■■■■■                    3",
    "≤ 50.0ms                                   0",
    "> 50.0ms     ■■■■■■■■■■■■■■■■■■■■          6",
  ]);
});

test("gives a nearly empty bucket at least one mark", async () => {
  await using bars = await renderBars(withBuckets(explicitBuckets([10], [1, 1000])), "ms");

  expect(bars.rows).toEqual([
    "≤ 10.0ms     ■                             1",
    "> 10.0ms     ■■■■■■■■■■■■■■■■■■■■      1,000",
  ]);
});

test("merges exponential buckets until no more than sixteen remain", async () => {
  const positive = Array.from({ length: 40 }, (_, index) => ({ index, count: 1 }));
  await using bars = await renderBars(withBuckets(exponentialBuckets(3, 0, 0, positive, [])), "");

  expect(bars.rows.map((row) => row.replace(/■+/, "").replace(/\s+/g, " "))).toEqual([
    "≤ 1.41 4",
    "≤ 2 4",
    "≤ 2.83 4",
    "≤ 4 4",
    "≤ 5.66 4",
    "≤ 8 4",
    "≤ 11.3 4",
    "≤ 16 4",
    "≤ 22.6 4",
    "≤ 32 4",
  ]);
});
