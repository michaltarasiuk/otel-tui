import { afterEach, expect, setSystemTime, test } from "bun:test";

import { type CapturedFrame, RGBA } from "@opentui/core";

import { renderApp } from "../../testing/app.tsx";
import {
  logsRequest,
  SEVERITY_NUMBER,
  SPAN_KIND,
  STATUS_CODE,
  tracesRequest,
} from "../../testing/otlp.ts";
import { startTestReceiver, type TestReceiver } from "../../testing/receiver.ts";
import { panelLines, textLines } from "../../testing/render.tsx";
import { collapseWhitespace } from "../../utils/text.ts";
import { serviceColor, THEME } from "../theme.ts";
import { COLUMN_WIDTH } from "./trace-histogram.tsx";

const baseTime = Date.parse("2026-10-28T12:00:00.000Z");

const cartTraceId = "1".repeat(32);
const checkoutTraceId = "2".repeat(32);
const healthTraceId = "3".repeat(32);
const rootlessTraceId = "4".repeat(32);
const missingParentId = "5".repeat(16);

const CART_ROW = "12:00:00.000 ● frontend GET /cart 3 120.0ms";
const CHECKOUT_ROW = "12:00:01.000 ● checkout POST /checkout 3 2 500.0ms";
const HEALTH_ROW = "12:00:02.000 ● frontend GET /health 1 1.0ms";
const NEWEST_FIRST = [HEALTH_ROW, CHECKOUT_ROW, CART_ROW];

afterEach(() => {
  setSystemTime();
});

function at(ms: number) {
  return new Date(baseTime + ms);
}

const otlpTraces = tracesRequest(
  {
    service: "frontend",
    attributes: { "host.name": "web-1" },
    scope: { name: "shop", version: "1.0.0" },
    spans: [
      {
        traceId: cartTraceId,
        spanId: "1a".repeat(8),
        name: "GET /cart",
        kind: SPAN_KIND.server,
        start: at(0),
        end: at(120),
        attributes: { "http.route": "/cart" },
      },
      {
        traceId: healthTraceId,
        spanId: "3a".repeat(8),
        name: "GET /health",
        start: at(2000),
        end: at(2001),
      },
    ],
  },
  {
    service: "cart",
    spans: [
      {
        traceId: cartTraceId,
        spanId: "1b".repeat(8),
        parentSpanId: "1a".repeat(8),
        name: "GetCart",
        kind: SPAN_KIND.server,
        start: at(10),
        end: at(90),
        events: [
          { name: "request queued", time: at(8) },
          { name: "cache miss", time: at(15), attributes: { "cache.key": "cart:42" } },
          { name: "cart loaded" },
        ],
      },
      {
        traceId: cartTraceId,
        spanId: "1c".repeat(8),
        parentSpanId: "1b".repeat(8),
        name: "SELECT carts",
        kind: SPAN_KIND.client,
        start: at(20),
        end: at(80),
        attributes: { "db.system": "postgresql" },
      },
    ],
  },
  {
    service: "checkout",
    spans: [
      {
        traceId: checkoutTraceId,
        spanId: "2a".repeat(8),
        name: "POST /checkout",
        kind: SPAN_KIND.server,
        start: at(1000),
        end: at(1450),
        status: { code: STATUS_CODE.error, message: "card declined" },
        links: [
          { traceId: cartTraceId, spanId: "1a".repeat(8), attributes: { "link.reason": "cart" } },
        ],
      },
    ],
  },
  {
    service: "payment",
    spans: [
      {
        traceId: checkoutTraceId,
        spanId: "2b".repeat(8),
        parentSpanId: "2a".repeat(8),
        name: "charge",
        kind: SPAN_KIND.client,
        start: at(1100),
        end: at(1400),
        status: { code: STATUS_CODE.error, message: "insufficient funds" },
      },
    ],
  },
  {
    service: "worker",
    spans: [
      {
        traceId: rootlessTraceId,
        spanId: "4b".repeat(8),
        parentSpanId: "4a".repeat(8),
        name: "process order",
        start: at(3000),
        end: at(3100),
      },
    ],
  },
  {
    service: "email",
    spans: [
      {
        traceId: checkoutTraceId,
        spanId: "2c".repeat(8),
        parentSpanId: missingParentId,
        name: "send receipt",
        kind: SPAN_KIND.consumer,
        start: at(1460),
        end: at(1500),
      },
    ],
  },
);

function traceRows(frame: string) {
  return textLines(frame).filter((line) => /^\d{2}:\d{2}:\d{2}\.\d{3} /.test(line));
}

function spanRows(frame: string) {
  const lines = frame.split("\n");
  const header = lines.findIndex((line) => line.includes("Service") && line.includes("Duration"));
  const panel = lines.findIndex((line) => line.startsWith("─"));
  return lines.slice(header + 1, panel).filter((line) => line.trim() !== "");
}

function barExtent({ lines }: CapturedFrame, name: string, color: string) {
  const background = RGBA.fromHex(color);
  const row = lines.find(
    ({ spans }) =>
      spans.some((span) => span.text.includes(name)) &&
      spans.some((span) => span.bg.equals(background)),
  );
  let column = 0;
  let start = -1;
  let end = -1;
  for (const span of row?.spans ?? []) {
    if (span.bg.equals(background)) {
      start = start === -1 ? column : start;
      end = column + span.width;
    }
    column += span.width;
  }
  return { start, end };
}

async function renderTraceList(receiver: TestReceiver) {
  await receiver.sendHttp("/v1/traces", otlpTraces);
  const app = await renderApp(receiver);
  await app.waitForFrame((frame) => traceRows(frame).length === 3);
  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("/ search"));
  return app;
}

async function openTrace(receiver: TestReceiver, row: string) {
  const app = await renderTraceList(receiver);
  for (const nextRow of NEWEST_FIRST.slice(1, NEWEST_FIRST.indexOf(row) + 1)) {
    app.mockInput.pressArrow("down");
    await app.waitForSelection(nextRow);
  }
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("escape back"));
  return app;
}

test("waits for traces before any arrive", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);

  const frame = await app.waitForFrame((frame) => frame.includes("Waiting for traces..."));

  expect(frame).toContain("0 traces");
});

test("lists traces whose root span arrived, newest first, with span and error counts", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await using app = await renderApp(receiver);

  const frame = await app.waitForFrame((frame) => traceRows(frame).length === 3);

  expect(textLines(frame)).toContain("3 traces");
  expect(textLines(frame)).toContain("Time ▼ Service Name Spans Errors Duration");
  expect(traceRows(frame)).toEqual(NEWEST_FIRST);
});

test("searches trace names, services, and IDs", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);

  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => frame.includes("trace name, service or ID"));
  await app.mockInput.typeText("cart");
  let frame = await app.waitForFrame((frame) => frame.includes("1 of 3 traces"));
  expect(traceRows(frame)).toEqual([CART_ROW]);

  app.mockInput.pressEnter();
  frame = await app.waitForFrame((frame) => frame.includes("/ search"));
  expect(textLines(frame)[1]).toBe("/cart 1 of 3 traces");

  app.mockInput.pressEscape();
  frame = await app.waitForFrame((frame) => traceRows(frame).length === 3);
  expect(textLines(frame)[1]).toBe("3 traces");

  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => frame.includes("trace name, service or ID"));
  await app.mockInput.typeText(healthTraceId.slice(0, 8));
  frame = await app.waitForFrame((frame) => frame.includes("1 of 3 traces"));
  expect(traceRows(frame)).toEqual([HEALTH_ROW]);
});

test("matches search text literally", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);

  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => frame.includes("trace name, service or ID"));
  await app.mockInput.typeText("_");

  const frame = await app.waitForFrame((frame) => frame.includes("No traces match"));
  expect(frame).toContain("0 of 3 traces");
});

test("shows only traces with errors", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);

  app.mockInput.pressKey("s");
  let frame = await app.waitForFrame((frame) => frame.includes("1 of 3 traces"));
  expect(textLines(frame)[1]).toBe("errors only 1 of 3 traces");
  expect(traceRows(frame)).toEqual([CHECKOUT_ROW]);

  app.mockInput.pressKey("s");
  frame = await app.waitForFrame((frame) => traceRows(frame).length === 3);
  expect(frame).not.toContain("errors only");
});

test("sorts by span count, error count, duration, and time", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);

  async function nextSort(header: string, rows: string[]) {
    app.mockInput.pressKey("o");
    const frame = await app.waitForFrame((frame) => Bun.deepEquals(traceRows(frame), rows));
    expect(textLines(frame)).toContain(header);
  }

  await nextSort("Time Service Name ▼ Spans Errors Duration", [CHECKOUT_ROW, CART_ROW, HEALTH_ROW]);
  await nextSort("Time Service Name Spans ▼ Errors Duration", [CHECKOUT_ROW, HEALTH_ROW, CART_ROW]);
  await nextSort("Time Service Name Spans Errors ▼ Duration", [CHECKOUT_ROW, CART_ROW, HEALTH_ROW]);
  await nextSort("Time ▼ Service Name Spans Errors Duration", NEWEST_FIRST);

  app.mockInput.pressKey("o", { shift: true });
  const frame = await app.waitForFrame((frame) =>
    Bun.deepEquals(traceRows(frame), [CART_ROW, CHECKOUT_ROW, HEALTH_ROW]),
  );
  expect(textLines(frame)).toContain("Time ▲ Service Name Spans Errors Duration");
});

test("jumps to the next trace with errors in either direction", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);
  await app.waitForSelection(HEALTH_ROW);

  app.mockInput.pressKey("e");
  expect(await app.waitForSelection("POST /checkout")).toBe(CHECKOUT_ROW);

  app.mockInput.pressKey("HOME");
  await app.waitForSelection(HEALTH_ROW);
  app.mockInput.pressKey("e", { shift: true });
  expect(await app.waitForSelection("POST /checkout")).toBe(CHECKOUT_ROW);
});

const LIVE_TIME_MS = 50_000;

const TIMELINE_CART_ROW = "12:00:00.000 ● frontend GET /cart 1 120.0ms";
const TIMELINE_CHECKOUT_ROW = "12:00:20.000 ● checkout POST /checkout 1 1 500.0ms";
const TIMELINE_HEALTH_ROW = "12:00:40.000 ● frontend GET /health 1 1.0ms";
const TIMELINE_OLD_ROW = "11:20:00.000 ● frontend GET /old 1 10.0ms";

const bar = "█".repeat(COLUMN_WIDTH);
const MINUTE_TICKS = "11:52 11:53 11:54 11:55 11:56 11:57 11:58 11:59 12:00";

const timelineTraces = tracesRequest(
  {
    service: "frontend",
    spans: [
      {
        traceId: "6".repeat(32),
        spanId: "6a".repeat(8),
        name: "GET /cart",
        start: at(0),
        end: at(120),
      },
      {
        traceId: "8".repeat(32),
        spanId: "8a".repeat(8),
        name: "GET /health",
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
        name: "POST /checkout",
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
      name: "GET /old",
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
  const app = await renderApp(receiver, size);
  await app.waitForFrame((frame) => frame.includes(TIMELINE_HEALTH_ROW.slice(0, 12)));
  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("/ search"));
  return app;
}

type HistogramApp = Awaited<ReturnType<typeof renderHistogram>>;

async function showsOnly(app: HistogramApp, row: string, range: string, totalCount = 3) {
  const frame = await app.waitForFrame((frame) => Bun.deepEquals(traceRows(frame), [row]));
  expect(textLines(frame)[1]).toBe(`${range} 1 of ${totalCount} traces`);
  return frame;
}

function axisLine(frame: string) {
  return textLines(frame)[7];
}

function barSpans(app: HistogramApp) {
  const barRow = app
    .captureSpans()
    .lines.find(({ spans }) => spans.some((span) => span.text.includes("█")));
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

  expect(barSpans(app).map((span) => span.fg.toInts())).toEqual(
    [THEME.bar, THEME.textError, THEME.bar].map((hex) => RGBA.fromHex(hex).toInts()),
  );
});

test("narrows the histogram with the search and the errors filter", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderHistogram(receiver);

  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => frame.includes("trace name, service or ID"));
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
  await showsOnly(app, TIMELINE_HEALTH_ROW, "12:00:40–12:00:50");

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
    ["right", TIMELINE_HEALTH_ROW, "12:00:40–12:00:50"],
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
  frame = await app.waitForFrame((frame) => traceRows(frame).length === 4);
  expect(frame).toContain("◀ earlier");
  expect(frame).not.toContain("later ▶");
});

test("highlights the selected bucket's column", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderHistogram(receiver);

  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("1 of 3 traces"));

  const highlighted = app
    .captureSpans()
    .lines.filter(({ spans }) =>
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

  const frame = await app.waitForFrame((frame) => traceRows(frame).length === 3);
  expect(textLines(frame)[1]).toBe("3 traces");
});

test("keeps the selected bucket when the search leaves it without traces", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderHistogram(receiver);
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("1 of 3 traces"));

  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => frame.includes("trace name, service or ID"));
  await app.mockInput.typeText("cart");

  const frame = await app.waitForFrame((frame) => frame.includes("No traces match"));
  expect(textLines(frame)[1]).toBe("/cart 12:00:40–12:00:50 0 of 3 traces");
  expect(frame).toContain("Traces over time");
});

test("leaves the list its room on a short terminal", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderHistogram(receiver, { size: { width: 120, height: 12 } });

  const frame = await app.waitForFrame((frame) => traceRows(frame).length === 3);

  expect(frame).not.toContain("Traces over time");
});

test("opens a trace as a span waterfall", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);

  const frame = await app.waitForFrame((frame) => spanRows(frame).length === 3);

  expect(textLines(frame).slice(1, 4)).toEqual([
    `POST /checkout ${checkoutTraceId}`,
    "● checkout 12:00:01.000 3 spans 2 errors 500.0ms",
    "Service Name Duration 0 500.0ms",
  ]);
  expect(spanRows(frame).map((row) => collapseWhitespace(row))).toEqual([
    "● checkout POST /checkout 450.0ms",
    "● payment charge 300.0ms",
    "● email send receipt 40.0ms",
  ]);
});

test("indents each span under its parent", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);

  const [root, child, grandchild] = spanRows(
    await app.waitForFrame((frame) => frame.includes("SELECT carts")),
  );
  const nameColumn = root?.indexOf("GET /cart") ?? -1;

  expect(child?.indexOf("GetCart")).toBe(nameColumn + 2);
  expect(grandchild?.indexOf("SELECT carts")).toBe(nameColumn + 4);
});

test("draws each span's bar inside its parent's bar", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);
  await app.waitForFrame((frame) => frame.includes("SELECT carts"));

  const frame = app.captureSpans();
  const root = barExtent(frame, "GET /cart", serviceColor("frontend"));
  const child = barExtent(frame, "GetCart", serviceColor("cart"));
  const grandchild = barExtent(frame, "SELECT carts", serviceColor("cart"));

  expect(root.start).toBeLessThan(child.start);
  expect(child.start).toBeLessThan(grandchild.start);
  expect(grandchild.end).toBeLessThan(child.end);
  expect(child.end).toBeLessThan(root.end);
});

test("shows the selected span's attributes, resource, and scope", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);

  const frame = await app.waitForFrame((frame) => frame.includes("Scope"));

  expect(panelLines(frame)).toEqual([
    `GET /cart ${"1a".repeat(8)}`,
    "● frontend server 12:00:00.000 +0µs 120.0ms",
    "Attributes",
    "http.route /cart",
    "Resource",
    "host.name web-1",
    "service.name frontend",
    "Scope",
    "shop 1.0.0",
  ]);
});

test("shows the selected span's events with their offsets", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);
  await app.waitForFrame((frame) => frame.includes("Scope"));

  app.mockInput.pressArrow("down");
  const frame = await app.waitForFrame((frame) => frame.includes("cache miss"));

  expect(panelLines(frame)).toEqual([
    `GetCart ${"1b".repeat(8)}`,
    "● cart server 12:00:00.010 +10.0ms 80.0ms",
    "Events",
    "-2.0ms request queued",
    "+5.0ms cache miss",
    "cache.key cart:42",
    "cart loaded",
    "Resource",
    "service.name cart",
  ]);
});

test("shows a span's links and status message", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);

  const frame = await app.waitForFrame((frame) => frame.includes("Links"));

  expect(panelLines(frame)).toEqual([
    `POST /checkout ${"2a".repeat(8)}`,
    "● checkout server 12:00:01.000 +0µs 450.0ms",
    "card declined",
    "Links",
    `${cartTraceId} ${"1a".repeat(8)}`,
    "link.reason cart",
    "Resource",
    "service.name checkout",
  ]);
});

test("points out a span whose parent never arrived", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);
  await app.waitForFrame((frame) => frame.includes("card declined"));

  app.mockInput.pressKey("END");
  const frame = await app.waitForFrame((frame) => frame.includes("not received"));

  expect(textLines(frame)).toContain(
    `● email consumer 12:00:01.460 +460.0ms 40.0ms parent ${missingParentId} not received`,
  );
});

test("opens a trace whose spans have no kind", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, HEALTH_ROW);

  const frame = await app.waitForFrame((frame) => frame.includes("unspecified"));

  expect(textLines(frame)).toContain("● frontend unspecified 12:00:02.000 +0µs 1.0ms");
});

test("jumps between spans with errors", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);
  await app.waitForFrame((frame) => frame.includes("card declined"));

  app.mockInput.pressKey("e");
  await app.waitForFrame((frame) => frame.includes("insufficient funds"));
  app.mockInput.pressKey("e");
  await app.waitForFrame((frame) => frame.includes("card declined"));
  app.mockInput.pressKey("e", { shift: true });
  await app.waitForFrame((frame) => frame.includes("insufficient funds"));

  expect(await app.waitForSelection("charge")).toBe("● payment charge 300.0ms");
});

test("goes back to the list with the opened trace still selected", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => traceRows(frame).length === 3);

  expect(await app.waitForSelection("POST /checkout")).toBe(CHECKOUT_ROW);
});

test("opens the logs of the open trace in the logs view", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/logs",
    logsRequest(
      {
        service: "checkout",
        logs: [
          {
            time: at(1100),
            severityNumber: SEVERITY_NUMBER.info,
            body: "order placed",
            traceId: checkoutTraceId,
            spanId: "2a".repeat(8),
          },
          { time: at(1900), severityNumber: SEVERITY_NUMBER.info, body: "cache warmed" },
        ],
      },
      {
        service: "payment",
        logs: [
          {
            time: at(1200),
            severityNumber: SEVERITY_NUMBER.error,
            body: "charge failed",
            traceId: checkoutTraceId,
            spanId: "2b".repeat(8),
          },
        ],
      },
    ),
  );
  await using app = await openTrace(receiver, CHECKOUT_ROW);

  app.mockInput.pressKey("l");

  const frame = await app.waitForFrame((frame) => frame.includes("order placed"));
  expect(textLines(frame)[1]).toBe("trace 22222222 2 of 3 logs");
  expect(frame).toContain("charge failed");
  expect(frame).not.toContain("cache warmed");
});

test("goes back from the trace's logs to the trace, then to the list", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({
      service: "checkout",
      logs: [{ time: at(1100), body: "order placed", traceId: checkoutTraceId }],
    }),
  );
  await using app = await openTrace(receiver, CHECKOUT_ROW);
  app.mockInput.pressKey("l");
  let frame = await app.waitForFrame((frame) => frame.includes("order placed"));
  expect(textLines(frame).at(-1)).toContain("escape back");

  app.mockInput.pressEscape();
  frame = await app.waitForFrame((frame) =>
    textLines(frame).includes(`POST /checkout ${checkoutTraceId}`),
  );
  expect(frame).not.toContain("order placed");

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => traceRows(frame).length === 3);
  expect(await app.waitForSelection("POST /checkout")).toBe(CHECKOUT_ROW);
});

test("keeps the search and sort when switching tabs", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);
  app.mockInput.pressKey("o");
  await app.waitForFrame((frame) => frame.includes("▼ Spans"));
  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => frame.includes("trace name, service or ID"));
  await app.mockInput.typeText("cart");
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("/ search"));

  app.mockInput.pressTab({ shift: true });
  await app.waitForFrame(
    (frame) => frame.includes("tab next region") && !frame.includes("/ search"),
  );
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));
  app.mockInput.pressArrow("left");

  const frame = await app.waitForFrame((frame) => traceRows(frame).length === 1);
  expect(textLines(frame)[1]).toBe("/cart 1 of 3 traces");
  expect(textLines(frame)).toContain("Time Service Name ▼ Spans Errors Duration");
  expect(traceRows(frame)).toEqual([CART_ROW]);
});

test("scrolls the span panel down and back up", async () => {
  await using receiver = await startTestReceiver();
  const attributes = Object.fromEntries(
    Array.from({ length: 30 }, (_, index) => [`attribute.${index + 1}`, "value"]),
  );
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "checkout",
      spans: [
        {
          traceId: cartTraceId,
          spanId: "1a".repeat(8),
          name: "GET /cart",
          start: at(0),
          end: at(10),
          attributes,
        },
      ],
    }),
  );
  await using app = await renderApp(receiver);
  await app.waitForFrame((frame) => traceRows(frame).length === 1);
  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("/ search"));
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => panelLines(frame).includes("attribute.1 value"));

  app.mockInput.pressKey("d", { ctrl: true });
  await app.waitForFrame((frame) => !panelLines(frame).includes("attribute.1 value"));

  app.mockInput.pressKey("u", { ctrl: true });
  await app.waitForFrame((frame) => panelLines(frame).includes("attribute.1 value"));
});

test("shows an error when traces cannot be loaded", async () => {
  await using receiver = await startTestReceiver();
  const connection = await receiver.connect();
  await connection.run("DROP TABLE otlp_traces");

  await using app = await renderApp(receiver);

  await app.waitForFrame((frame) => frame.includes("Failed to load traces"));
});

test("says when an open trace is no longer available", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);
  await app.waitForFrame((frame) => frame.includes("SELECT carts"));

  const connection = await receiver.connect();
  await connection.run("DELETE FROM otlp_traces WHERE trace_id = $traceId", {
    traceId: cartTraceId,
  });

  await app.waitForFrame((frame) => frame.includes("This trace is no longer available"));
});
