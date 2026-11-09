import { afterEach, expect, mock, setSystemTime, test } from "bun:test";

import { RGBA } from "@opentui/core";

import { renderPage } from "#testing/app.tsx";
import { at } from "#testing/clock.ts";
import { STATUS_CODE, tracesRequest } from "#testing/otlp.ts";
import { startTestReceiver, type TestReceiver } from "#testing/receiver.ts";
import { pageHeader, tableRows, textLines } from "#testing/screen.ts";
import { PLACE_ORDER } from "#testing/traces.ts";
import { HISTOGRAM_COLUMN_WIDTH } from "#tui/histogram/time-histogram.tsx";
import { THEME } from "#tui/theme/theme.ts";

afterEach(() => {
  setSystemTime();
  mock.restore();
});

const LIVE_TIME_MS = 50_000;

const TIMELINE_CART_ROW = "12:00:00.000 ● frontend GET /api/cart 1 120.0ms";
const TIMELINE_CHECKOUT_ROW = `12:00:20.000 ● checkout ${PLACE_ORDER} 1 1 500.0ms`;
const TIMELINE_STATUS_ROW = "12:00:40.000 ● image-provider GET /status 1 1.0ms";
const TIMELINE_OLD_ROW = "11:20:00.000 ● frontend GET /product/[productId] 1 10.0ms";

const bar = "█".repeat(HISTOGRAM_COLUMN_WIDTH);
const MINUTE_TICKS = "11:52 11:53 11:54 11:55 11:56 11:57 11:58 11:59 12:00";

const timelineTraces = tracesRequest(
  {
    service: "frontend",
    spans: [
      {
        traceId: "6".repeat(32),
        spanId: "6a".repeat(8),
        name: "GET /api/cart",
        start: at(0),
        end: at(120),
      },
    ],
  },
  {
    service: "image-provider",
    spans: [
      {
        traceId: "8".repeat(32),
        spanId: "8a".repeat(8),
        name: "GET /status",
        start: at(40_000),
        end: at(40_001),
      },
    ],
  },
  {
    service: "checkout",
    spans: [
      {
        traceId: "7".repeat(32),
        spanId: "7a".repeat(8),
        name: PLACE_ORDER,
        start: at(20_000),
        end: at(20_500),
        status: { code: STATUS_CODE.error },
      },
    ],
  },
);

const oldTrace = tracesRequest({
  service: "frontend",
  spans: [
    {
      traceId: "9".repeat(32),
      spanId: "9a".repeat(8),
      name: "GET /product/[productId]",
      start: at(-40 * 60_000),
      end: at(-40 * 60_000 + 10),
    },
  ],
});

interface HistogramOptions {
  size?: { width: number; height: number };
  withOldTrace?: boolean;
}

async function renderHistogram(
  receiver: TestReceiver,
  { size, withOldTrace }: HistogramOptions = {},
) {
  setSystemTime(at(LIVE_TIME_MS));
  await receiver.sendHttp("/v1/traces", timelineTraces);
  if (withOldTrace === true) {
    await receiver.sendHttp("/v1/traces", oldTrace);
  }
  const app = await renderPage(receiver, "traces", { size });
  await app.waitForFrame((frame) => frame.includes(TIMELINE_STATUS_ROW.slice(0, 12)));
  return app;
}
type HistogramApp = Awaited<ReturnType<typeof renderHistogram>>;

async function showsOnly(app: HistogramApp, row: string, range: string, totalCount = 3) {
  const frame = await app.waitForFrame((frame) => Bun.deepEquals(tableRows(frame), [row]));
  expect(pageHeader(frame)).toBe(`${range} 1 of ${totalCount} traces`);
  return frame;
}

function axisLine(frame: string) {
  return textLines(frame)[7];
}

async function barSpans(app: HistogramApp) {
  const barRow = (await app.captureSpans()).lines.find(({ spans }) =>
    spans.some((span) => span.text.includes("█")),
  );
  return (barRow?.spans ?? []).filter((span) => span.text.includes("█"));
}

test("draws a histogram of traces over time above the list", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderHistogram(receiver);

  const frame = await app.waitForFrame((frame) => frame.includes("12:00"));

  expect(textLines(frame).slice(1, 8)).toEqual([
    "3 traces",
    "Traces over time ■ errors 10s per column",
    ...Array.from({ length: 4 }, () => `${bar} ${bar} ${bar}`),
    MINUTE_TICKS,
  ]);
});

test("colors the histogram's errors apart from the other traces", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderHistogram(receiver);
  await app.waitForFrame((frame) => frame.includes("Traces over time"));

  expect((await barSpans(app)).map((span) => span.fg.toInts())).toEqual(
    [THEME.bar, THEME.textError, THEME.bar].map((hex) => RGBA.fromHex(hex).toInts()),
  );
});

test("narrows the histogram with the search and the errors filter", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderHistogram(receiver);

  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => frame.includes("trace name, service, ID or key=value"));
  await app.mockInput.typeText("cart");
  let frame = await app.waitForFrame((frame) => !frame.includes("■ errors"));
  expect(textLines(frame).slice(2, 4)).toEqual(["Traces over time 10s per column", bar]);

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => frame.includes("■ errors"));
  app.mockInput.pressKey("s");
  frame = await app.waitForFrame((frame) => frame.includes("1 of 3 traces"));
  expect(textLines(frame).slice(2, 6)).toEqual([
    "Traces over time ■ errors 10s per column",
    bar,
    bar,
    bar,
  ]);
});

test("moves the marker over the timeline, latest bucket first", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderHistogram(receiver);

  app.mockInput.pressArrow("right");
  await showsOnly(app, TIMELINE_STATUS_ROW, "12:00:40–12:00:50");

  app.mockInput.pressArrow("left");
  await showsOnly(app, TIMELINE_CHECKOUT_ROW, "12:00:20–12:00:30");

  app.mockInput.pressArrow("left");
  await showsOnly(app, TIMELINE_CART_ROW, "12:00:00–12:00:10");

  app.mockInput.pressArrow("right");
  await showsOnly(app, TIMELINE_CHECKOUT_ROW, "12:00:20–12:00:30");
});

test("scrolls the timeline to keep the marker in view", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderHistogram(receiver, { withOldTrace: true });

  let frame = await app.waitForFrame((frame) => frame.includes("◀ earlier"));
  expect(frame).not.toContain("later ▶");
  expect(axisLine(frame)).toBe(MINUTE_TICKS);

  for (const [arrow, row, range] of [
    ["right", TIMELINE_STATUS_ROW, "12:00:40–12:00:50"],
    ["left", TIMELINE_CHECKOUT_ROW, "12:00:20–12:00:30"],
    ["left", TIMELINE_CART_ROW, "12:00:00–12:00:10"],
    ["left", TIMELINE_OLD_ROW, "11:20:00–11:20:10"],
  ] as const) {
    app.mockInput.pressArrow(arrow);
    frame = await showsOnly(app, row, range, 4);
  }

  expect(frame).toContain("later ▶");
  expect(frame).not.toContain("◀ earlier");
  expect(axisLine(frame)).toContain("11:20");

  app.mockInput.pressEscape();
  frame = await app.waitForFrame((frame) => tableRows(frame).length === 4);
  expect(frame).toContain("◀ earlier");
  expect(frame).not.toContain("later ▶");
});

test("highlights the selected bucket's column", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderHistogram(receiver);

  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("1 of 3 traces"));

  const highlighted = (await app.captureSpans()).lines.filter(({ spans }) =>
    spans.some((span) => span.bg.equals(RGBA.fromHex(THEME.backgroundSelected))),
  );
  expect(highlighted).toHaveLength(4 + 1);
});

test("clears the selected bucket with escape", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderHistogram(receiver);
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("escape any time"));

  app.mockInput.pressEscape();

  const frame = await app.waitForFrame((frame) => tableRows(frame).length === 3);
  expect(pageHeader(frame)).toBe("3 traces");
});

test("keeps the selected bucket when the search leaves it without traces", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderHistogram(receiver);
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("1 of 3 traces"));

  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => frame.includes("trace name, service, ID or key=value"));
  await app.mockInput.typeText("cart");

  const frame = await app.waitForFrame((frame) => frame.includes("No traces match"));
  expect(pageHeader(frame)).toBe("/cart 12:00:40–12:00:50 0 of 3 traces");
  expect(frame).toContain("Traces over time");
});

test("leaves the list its room on a short terminal", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderHistogram(receiver, { size: { width: 120, height: 12 } });

  const frame = await app.waitForFrame((frame) => tableRows(frame).length === 3);

  expect(frame).not.toContain("Traces over time");
});
