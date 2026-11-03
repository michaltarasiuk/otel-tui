import { afterEach, beforeEach, expect, setSystemTime, test } from "bun:test";

import { renderApp } from "../../testing/app.tsx";
import { metricsRequest, TEMPORALITY } from "../../testing/otlp.ts";
import { startTestReceiver, type TestReceiver } from "../../testing/receiver.ts";
import { BRAILLE_DOTS, panelLines, textLines } from "../../testing/render.tsx";

const baseTime = Date.parse("2026-10-28T12:00:00.000Z");

const DETAILS_SIZE = { width: 120, height: 45 };

const METRIC_COUNT = / metrics? *$/m;

function atSecond(seconds: number) {
  return new Date(baseTime + seconds * 1000);
}

function flagRequests(flag: string, values: number[]) {
  return values.map((value, index) => ({
    attributes: { "feature_flag.key": flag },
    start: atSecond(0),
    time: atSecond(10 * (index + 1)),
    value,
  }));
}

const otlpMetrics = metricsRequest(
  {
    service: "shipping",
    scope: { name: "otel_demo.shipping.quote" },
    metrics: [
      {
        name: "demo.shipping.items_shipped",
        monotonic: true,
        temporality: TEMPORALITY.delta,
        sum: [
          { start: atSecond(0), time: atSecond(10), value: 3 },
          { start: atSecond(10), time: atSecond(20), value: 4 },
          { start: atSecond(20), time: atSecond(30), value: 5 },
        ],
      },
    ],
  },
  {
    service: "shipping",
    scope: { name: "opentelemetry-instrumentation-actix-web", version: "0.24.0" },
    metrics: [
      {
        name: "http.server.request.body.size",
        unit: "By",
        temporality: TEMPORALITY.cumulative,
        exponentialHistogram: [
          {
            start: atSecond(0),
            time: atSecond(10),
            count: 3,
            scale: 0,
            positive: { offset: 9, counts: [1, 2] },
          },
          {
            start: atSecond(0),
            time: atSecond(20),
            count: 6,
            scale: 0,
            positive: { offset: 9, counts: [2, 4] },
          },
        ],
      },
    ],
  },
  {
    service: "cart",
    scope: { name: "OpenFeature", version: "2.14.1.0" },
    metrics: [
      {
        name: "feature_flag.evaluation_requests_total",
        unit: "{request}",
        description: "feature flag evaluation request counter",
        monotonic: true,
        temporality: TEMPORALITY.cumulative,
        sum: [
          ...flagRequests("cartFailure", [100, 150, 250]),
          ...flagRequests("failedReadinessProbe", [20, 30, 50]),
        ],
      },
    ],
  },
  {
    service: "cart",
    scope: { name: "Microsoft.AspNetCore.Hosting" },
    metrics: [
      {
        name: "http.server.request.duration",
        unit: "s",
        temporality: TEMPORALITY.delta,
        histogram: [
          {
            start: atSecond(0),
            time: atSecond(10),
            count: 5,
            sum: 0.15,
            min: 0.005,
            max: 0.08,
            bounds: [0.01, 0.05, 0.1],
            counts: [1, 3, 1, 0],
            exemplars: [{ time: atSecond(9), value: 0.075 }],
          },
          {
            start: atSecond(10),
            time: atSecond(20),
            count: 5,
            sum: 0.4,
            min: 0.02,
            max: 0.15,
            bounds: [0.01, 0.05, 0.1],
            counts: [0, 2, 2, 1],
            exemplars: [
              { time: atSecond(19), value: 0.14, traceId: "2".repeat(32), spanId: "2b".repeat(8) },
            ],
          },
        ],
      },
    ],
  },
  {
    service: "cart",
    scope: { name: "OpenTelemetry.Instrumentation.Process", version: "1.18.0-rc.1" },
    metrics: [
      {
        name: "process.thread.count",
        unit: "{thread}",
        monotonic: false,
        temporality: TEMPORALITY.cumulative,
        sum: [
          { start: atSecond(0), time: atSecond(10), value: 5 },
          { start: atSecond(0), time: atSecond(20), value: 3 },
          { start: atSecond(0), time: atSecond(30), value: 8 },
        ],
      },
    ],
  },
  {
    service: "frontend",
    scope: { name: "@opentelemetry/instrumentation-runtime-node", version: "0.35.0" },
    metrics: [
      {
        name: "v8js.memory.heap.used",
        unit: "By",
        gauge: [
          { time: atSecond(10), value: 1_048_576 },
          { time: atSecond(20), value: 2_097_152 },
          { time: atSecond(30), value: 1_572_864 },
        ],
      },
    ],
  },
);

const ITEMS_SHIPPED_ROW = "12:00:30.000 ● shipping demo.shipping.items_shipped counter 1";
const FLAG_REQUESTS_ROW =
  "12:00:30.000 ● cart feature_flag.evaluation_requests_total counter {request} 2";
const BODY_SIZE_ROW = "12:00:20.000 ● shipping http.server.request.body.size exp histogram By 1";
const DURATION_ROW = "12:00:20.000 ● cart http.server.request.duration histogram s 1";
const THREADS_ROW = "12:00:30.000 ● cart process.thread.count updowncounter {thread} 1";
const HEAP_ROW = "12:00:30.000 ● frontend v8js.memory.heap.used gauge By 1";
const BY_NAME = [
  ITEMS_SHIPPED_ROW,
  FLAG_REQUESTS_ROW,
  BODY_SIZE_ROW,
  DURATION_ROW,
  THREADS_ROW,
  HEAP_ROW,
];

beforeEach(() => {
  setSystemTime(atSecond(60));
});

afterEach(() => {
  setSystemTime();
});

function metricRows(frame: string) {
  return textLines(frame).filter((line) => /^\d{2}:\d{2}:\d{2}\.\d{3} /.test(line));
}

async function renderMetrics(receiver: TestReceiver, size?: { width: number; height: number }) {
  const app = await renderApp(receiver, size);
  await app.waitForFrame((frame) => frame.includes("tab next region"));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => METRIC_COUNT.test(frame));
  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("/ search"));
  return app;
}

async function renderMetricList(receiver: TestReceiver, size?: { width: number; height: number }) {
  await receiver.sendHttp("/v1/metrics", otlpMetrics);
  const app = await renderMetrics(receiver, size);
  await app.waitForFrame((frame) => metricRows(frame).length === BY_NAME.length);
  return app;
}

async function openMetric(receiver: TestReceiver, row: string) {
  const app = await renderMetricList(receiver, DETAILS_SIZE);
  const rowIndex = BY_NAME.indexOf(row);
  for (const nextRow of BY_NAME.slice(1, rowIndex + 1)) {
    app.mockInput.pressArrow("down");
    await app.waitForSelection(nextRow);
  }
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("escape back"));
  return app;
}

test("waits for metrics before any arrive", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetrics(receiver);

  const frame = await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));

  expect(frame).toContain("0 metrics");
});

test("lists metrics by name with their type, unit, and series count", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetricList(receiver);

  const frame = await app.waitForFrame((frame) => frame.includes("6 metrics"));

  expect(textLines(frame)).toContain("Time Service Name ▲ Type Unit Series");
  expect(metricRows(frame)).toEqual(BY_NAME);
});

test("sorts by series count, last update, and name", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetricList(receiver);

  async function pressSortKey(shift: boolean, header: string, rows: string[]) {
    app.mockInput.pressKey("o", { shift });
    const frame = await app.waitForFrame((frame) => Bun.deepEquals(metricRows(frame), rows));
    expect(textLines(frame)).toContain(header);
  }

  await pressSortKey(false, "Time Service Name Type Unit ▼ Series", [
    FLAG_REQUESTS_ROW,
    ITEMS_SHIPPED_ROW,
    BODY_SIZE_ROW,
    DURATION_ROW,
    THREADS_ROW,
    HEAP_ROW,
  ]);
  await pressSortKey(false, "Time ▼ Service Name Type Unit Series", [
    ITEMS_SHIPPED_ROW,
    FLAG_REQUESTS_ROW,
    THREADS_ROW,
    HEAP_ROW,
    BODY_SIZE_ROW,
    DURATION_ROW,
  ]);
  await pressSortKey(false, "Time Service Name ▲ Type Unit Series", BY_NAME);
  await pressSortKey(true, "Time Service Name ▼ Type Unit Series", BY_NAME.toReversed());
});

test("searches names, descriptions, and attributes", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetricList(receiver);

  async function search(text: string, rows: string[]) {
    app.mockInput.pressKey("/");
    await app.waitForFrame((frame) => frame.includes("name, description, service or attributes"));
    await app.mockInput.typeText(text);
    const frame = await app.waitForFrame((frame) => Bun.deepEquals(metricRows(frame), rows));
    expect(frame).toContain(`${rows.length} of 6 metrics`);
    app.mockInput.pressEscape();
    await app.waitForFrame((frame) => metricRows(frame).length === 6);
  }

  await search("body", [BODY_SIZE_ROW]);
  await search("evaluation request counter", [FLAG_REQUESTS_ROW]);
  await search("failedReadinessProbe", [FLAG_REQUESTS_ROW]);
});

test("keeps an applied search while browsing", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetricList(receiver);

  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => frame.includes("name, description, service or attributes"));
  await app.mockInput.typeText("http");
  await app.waitForFrame((frame) => metricRows(frame).length === 2);
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("/ search"));

  app.mockInput.pressArrow("down");

  expect(await app.waitForSelection("http.server.request.duration")).toBe(DURATION_ROW);
  await app.waitForFrame((frame) => textLines(frame)[1] === "/http 2 of 6 metrics");
});

test("summarizes the selected metric's attribute values", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetricList(receiver);

  app.mockInput.pressArrow("down");
  const frame = await app.waitForFrame((frame) =>
    panelLines(frame).includes("OpenFeature 2.14.1.0"),
  );

  expect(panelLines(frame)).toEqual([
    "feature_flag.evaluation_requests_total counter",
    "● cart unit {request} cumulative 2 series",
    "feature flag evaluation request counter",
    "Attributes",
    "feature_flag.key cartFailure, failedReadinessProbe",
    "Resource",
    "service.name cart",
    "Scope",
    "OpenFeature 2.14.1.0",
  ]);
});

test("lists a few attribute values and counts the rest", async () => {
  await using receiver = await startTestReceiver();
  const cores = ["0", "1", "2", "3", "4"];
  await receiver.sendHttp(
    "/v1/metrics",
    metricsRequest({
      service: "recommendation",
      metrics: [
        {
          name: "system.cpu.utilization",
          unit: "1",
          gauge: cores.map((cpu) => ({ attributes: { cpu }, time: atSecond(10), value: 0.5 })),
        },
      ],
    }),
  );
  await using app = await renderMetrics(receiver);

  const frame = await app.waitForFrame((frame) => frame.includes("Attributes"));

  expect(panelLines(frame)).toContain("cpu 0, 1, 2 and 2 more");
});

test("opens a counter's series with their rates and totals", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, FLAG_REQUESTS_ROW);

  const frame = await app.waitForFrame(
    (frame) => BRAILLE_DOTS.test(frame) && textLines(frame).includes("failedReadinessProbe 2/s 50"),
  );

  expect(textLines(frame).slice(1, 7)).toEqual([
    "feature_flag.evaluation_requests_total counter",
    "● cart unit {request} cumulative 2 series",
    "feature flag evaluation request counter",
    "feature_flag.key Rate Total",
    "cartFailure 10/s 250",
    "failedReadinessProbe 2/s 50",
  ]);
  const panel = panelLines(frame);
  expect(panel.slice(0, 3)).toEqual(["cartFailure 12:00:30.000", "rate 10/s total 250", "Rate"]);
  expect(panel[3]).toStartWith("10/s ");
  expect(panel.slice(-8)).toEqual([
    "0/s",
    "12:00:00.000 now",
    "Attributes",
    "feature_flag.key cartFailure",
    "Resource",
    "service.name cart",
    "Scope",
    "OpenFeature 2.14.1.0",
  ]);
});

test("shows the series picked in the table", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, FLAG_REQUESTS_ROW);
  await app.waitForFrame((frame) => textLines(frame).includes("failedReadinessProbe 2/s 50"));

  app.mockInput.pressArrow("down");
  const frame = await app.waitForFrame(
    (frame) => panelLines(frame)[0] === "failedReadinessProbe 12:00:30.000",
  );

  expect(panelLines(frame)[1]).toBe("rate 2/s total 50");
});

test("adds up a delta counter's points", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, ITEMS_SHIPPED_ROW);

  const frame = await app.waitForFrame((frame) => textLines(frame).includes("none 0.5/s 12"));

  expect(textLines(frame).slice(3, 5)).toEqual(["Attributes Rate Total", "none 0.5/s 12"]);
});

test("shows the last, lowest, and highest value of gauges and updowncounters", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, HEAP_ROW);
  let frame = await app.waitForFrame((frame) =>
    textLines(frame).includes("none 1.5 MiB 1.0 MiB 2.0 MiB"),
  );
  expect(textLines(frame).slice(3, 5)).toEqual([
    "Attributes Last Min Max",
    "none 1.5 MiB 1.0 MiB 2.0 MiB",
  ]);

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => frame.includes("6 metrics"));
  app.mockInput.pressArrow("up");
  await app.waitForSelection(THREADS_ROW);
  app.mockInput.pressEnter();
  frame = await app.waitForFrame((frame) => textLines(frame).includes("none 8 3 8"));
  expect(panelLines(frame)[1]).toBe("last 8 min 3 max 8");
});

test("shows a histogram's percentiles, buckets, and exemplars", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, DURATION_ROW);

  const frame = await app.waitForFrame(
    (frame) =>
      frame.includes("Exemplars") &&
      BRAILLE_DOTS.test(frame) &&
      textLines(frame).includes("none 10 42.0ms 125.0ms 145.0ms 150.0ms"),
  );

  expect(textLines(frame).slice(3, 5)).toEqual([
    "Attributes Count p50 p95 p99 Max",
    "none 10 42.0ms 125.0ms 145.0ms 150.0ms",
  ]);
  const panel = panelLines(frame);
  expect(panel.slice(0, 4)).toEqual([
    "no attributes 12:00:20.000",
    "count 10 p50 42.0ms p95 125.0ms p99 145.0ms max 150.0ms",
    "Percentiles",
    "● p50 ● p95 ● p99",
  ]);
  expect(panel.filter((line) => line.includes("■")).map((line) => line.replace(/ ■+/, ""))).toEqual(
    ["≤ 10.0ms 1", "≤ 50.0ms 5", "≤ 100.0ms 3", "> 100.0ms 1"],
  );
  const exemplarsIndex = panel.indexOf("Exemplars");
  expect(panel.slice(exemplarsIndex, exemplarsIndex + 3)).toEqual([
    "Exemplars",
    `12:00:19.000 140.0ms ${"2".repeat(32)} ${"2b".repeat(8)}`,
    "12:00:09.000 75.0ms no trace",
  ]);
});

test("shows an exponential histogram's buckets", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, BODY_SIZE_ROW);

  const frame = await app.waitForFrame((frame) => frame.includes("Buckets"));

  expect(panelLines(frame)[1]).toBe("count 6 p50 1.3 KiB p95 1.9 KiB p99 2.0 KiB max");
  expect(
    panelLines(frame)
      .filter((line) => line.includes("■"))
      .map((line) => line.replace(/ ■+/, "")),
  ).toEqual(["≤ 1.0 KiB 2", "≤ 2.0 KiB 4"]);
});

test("waits for a second export before plotting a counter's rate", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/metrics",
    metricsRequest({
      service: "currency",
      metrics: [
        {
          name: "demo.exchange.conversions_counter",
          monotonic: true,
          temporality: TEMPORALITY.cumulative,
          sum: [{ start: atSecond(0), time: atSecond(10), value: 5 }],
        },
      ],
    }),
  );
  await using app = await renderMetrics(receiver, DETAILS_SIZE);
  await app.waitForFrame((frame) => metricRows(frame).length === 1);

  app.mockInput.pressEnter();

  const frame = await app.waitForFrame((frame) => frame.includes("Not enough data points"));
  expect(panelLines(frame).slice(0, 2)).toEqual(["no attributes 12:00:10.000", "rate total 5"]);
});

test("goes back to the list with the opened metric still selected", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, ITEMS_SHIPPED_ROW);

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => frame.includes("6 metrics"));

  expect(await app.waitForSelection("demo.shipping.items_shipped")).toBe(ITEMS_SHIPPED_ROW);
});

test("adds up a delta updowncounter's changes", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/metrics",
    metricsRequest({
      service: "cart",
      metrics: [
        {
          name: "http.server.active_requests",
          unit: "{request}",
          monotonic: false,
          temporality: TEMPORALITY.delta,
          sum: [
            { start: atSecond(0), time: atSecond(10), value: 2 },
            { start: atSecond(10), time: atSecond(20), value: -1 },
            { start: atSecond(20), time: atSecond(30), value: 3 },
          ],
        },
      ],
    }),
  );
  await using app = await renderMetrics(receiver, DETAILS_SIZE);
  await app.waitForFrame((frame) => metricRows(frame).length === 1);

  app.mockInput.pressEnter();

  const frame = await app.waitForFrame(
    (frame) => BRAILLE_DOTS.test(frame) && textLines(frame).includes("none 4 1 4"),
  );
  const panel = panelLines(frame);
  expect(panel.slice(0, 3)).toEqual(["no attributes 12:00:30.000", "last 4 min 1 max 4", "Value"]);
  expect(panel[3]).toStartWith("4 ");
  expect(panel).toContain("12:00:00.000 now");
});

test("opens a delta histogram that exports no buckets", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/metrics",
    metricsRequest({
      service: "cart",
      metrics: [
        {
          name: "http.server.request.duration",
          unit: "s",
          temporality: TEMPORALITY.delta,
          histogram: [
            { start: atSecond(0), time: atSecond(10), count: 3, bounds: [], counts: [] },
            { start: atSecond(10), time: atSecond(20), count: 2, bounds: [], counts: [] },
          ],
        },
      ],
    }),
  );
  await using app = await renderMetrics(receiver, DETAILS_SIZE);
  await app.waitForFrame((frame) => metricRows(frame).length === 1);

  app.mockInput.pressEnter();

  const frame = await app.waitForFrame((frame) => textLines(frame).includes("none 5"));
  expect(panelLines(frame).slice(0, 2)).toEqual([
    "no attributes 12:00:20.000",
    "count 5 p50 p95 p99 max",
  ]);
});

test("scrolls the metric panel down and back up", async () => {
  await using receiver = await startTestReceiver();
  const attributes = Object.fromEntries(
    Array.from({ length: 30 }, (_, index) => [`demo.product.id.${index + 1}`, "0PUK6V6EV0"]),
  );
  await receiver.sendHttp(
    "/v1/metrics",
    metricsRequest({
      service: "product-catalog",
      metrics: [
        { name: "db.sql.connection.open", gauge: [{ attributes, time: atSecond(10), value: 1 }] },
      ],
    }),
  );
  await using app = await renderMetrics(receiver);
  await app.waitForFrame((frame) => panelLines(frame).includes("demo.product.id.1 0PUK6V6EV0"));

  app.mockInput.pressKey("d", { ctrl: true });
  await app.waitForFrame((frame) => !panelLines(frame).includes("demo.product.id.1 0PUK6V6EV0"));

  app.mockInput.pressKey("u", { ctrl: true });
  await app.waitForFrame((frame) => panelLines(frame).includes("demo.product.id.1 0PUK6V6EV0"));
});

test("scrolls the series panel down and back up", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetricList(receiver);
  const durationRowIndex = BY_NAME.indexOf(DURATION_ROW);
  for (const row of BY_NAME.slice(1, durationRowIndex + 1)) {
    app.mockInput.pressArrow("down");
    await app.waitForSelection(row);
  }
  app.mockInput.pressEnter();
  await app.waitForFrame(
    (frame) => panelLines(frame).includes("Exemplars") && BRAILLE_DOTS.test(frame),
  );

  app.mockInput.pressKey("d", { ctrl: true });
  await app.waitForFrame((frame) => !panelLines(frame).includes("Percentiles"));

  app.mockInput.pressKey("u", { ctrl: true });
  await app.waitForFrame((frame) => panelLines(frame).includes("Percentiles"));
});

test("shows an error when metrics cannot be loaded", async () => {
  await using receiver = await startTestReceiver();
  const connection = await receiver.connect();
  await connection.run("DROP TABLE otlp_metrics_gauge");

  await using app = await renderMetrics(receiver);

  await app.waitForFrame((frame) => frame.includes("Failed to load metrics"));
});

test("says when an open metric is no longer available", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, ITEMS_SHIPPED_ROW);
  await app.waitForFrame((frame) => textLines(frame).includes("none 0.5/s 12"));

  const connection = await receiver.connect();
  await connection.run("DELETE FROM otlp_metrics_sum WHERE name = 'demo.shipping.items_shipped'");

  await app.waitForFrame((frame) => frame.includes("This metric is no longer available"));
});
