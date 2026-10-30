import { afterEach, beforeEach, expect, setSystemTime, test } from "bun:test";

import { renderApp } from "../../testing/app.tsx";
import { metricsRequest, TEMPORALITY } from "../../testing/otlp.ts";
import { startTestReceiver, type TestReceiver } from "../../testing/receiver.ts";
import { panelLines, textLines } from "../../testing/render.tsx";

const BASE_TIME = Date.parse("2026-10-28T12:00:00.000Z");
const DETAILS_SIZE = { width: 120, height: 45 };
const BRAILLE_DOTS = /[\u2801-\u28FF]/;
const METRIC_COUNT = / metrics? *$/m;

function atSecond(seconds: number) {
  return new Date(BASE_TIME + seconds * 1000);
}

function routeRequests(route: string, values: number[]) {
  return values.map((value, index) => ({
    attributes: { "http.route": route },
    start: atSecond(0),
    time: atSecond(10 * (index + 1)),
    value,
  }));
}

const METRICS = metricsRequest({
  service: "checkout",
  scope: { name: "shop", version: "1.0.0" },
  metrics: [
    {
      name: "http.server.requests",
      unit: "{request}",
      description: "Requests served",
      monotonic: true,
      temporality: TEMPORALITY.cumulative,
      sum: [
        ...routeRequests("/cart", [100, 150, 250]),
        ...routeRequests("/checkout", [20, 30, 50]),
      ],
    },
    {
      name: "jobs.completed",
      unit: "{job}",
      monotonic: true,
      temporality: TEMPORALITY.delta,
      sum: [
        { start: atSecond(0), time: atSecond(10), value: 3 },
        { start: atSecond(10), time: atSecond(20), value: 4 },
        { start: atSecond(20), time: atSecond(30), value: 5 },
      ],
    },
    {
      name: "process.memory.usage",
      unit: "By",
      gauge: [
        { time: atSecond(10), value: 1_048_576 },
        { time: atSecond(20), value: 2_097_152 },
        { time: atSecond(30), value: 1_572_864 },
      ],
    },
    {
      name: "queue.size",
      unit: "{job}",
      monotonic: false,
      temporality: TEMPORALITY.cumulative,
      sum: [
        { start: atSecond(0), time: atSecond(10), value: 5 },
        { start: atSecond(0), time: atSecond(20), value: 3 },
        { start: atSecond(0), time: atSecond(30), value: 8 },
      ],
    },
    {
      name: "http.server.duration",
      unit: "ms",
      temporality: TEMPORALITY.delta,
      histogram: [
        {
          start: atSecond(0),
          time: atSecond(10),
          count: 5,
          sum: 150,
          min: 5,
          max: 80,
          bounds: [10, 50, 100],
          counts: [1, 3, 1, 0],
          exemplars: [{ time: atSecond(9), value: 75 }],
        },
        {
          start: atSecond(10),
          time: atSecond(20),
          count: 5,
          sum: 400,
          min: 20,
          max: 150,
          bounds: [10, 50, 100],
          counts: [0, 2, 2, 1],
          exemplars: [
            { time: atSecond(19), value: 140, traceId: "2".repeat(32), spanId: "2b".repeat(8) },
          ],
        },
      ],
    },
    {
      name: "rpc.payload.size",
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
});

const DURATION_ROW = "12:00:20.000 ● checkout http.server.duration histogram ms 1";
const REQUESTS_ROW = "12:00:30.000 ● checkout http.server.requests counter {request} 2";
const JOBS_ROW = "12:00:30.000 ● checkout jobs.completed counter {job} 1";
const MEMORY_ROW = "12:00:30.000 ● checkout process.memory.usage gauge By 1";
const QUEUE_ROW = "12:00:30.000 ● checkout queue.size updowncounter {job} 1";
const PAYLOAD_ROW = "12:00:20.000 ● checkout rpc.payload.size exp histogram By 1";
const BY_NAME = [DURATION_ROW, REQUESTS_ROW, JOBS_ROW, MEMORY_ROW, QUEUE_ROW, PAYLOAD_ROW];

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
  await receiver.send("/v1/metrics", METRICS);
  const app = await renderMetrics(receiver, size);
  await app.waitForFrame((frame) => metricRows(frame).length === BY_NAME.length);
  return app;
}

async function openMetric(receiver: TestReceiver, row: string) {
  const app = await renderMetricList(receiver, DETAILS_SIZE);
  for (const nextRow of BY_NAME.slice(1, BY_NAME.indexOf(row) + 1)) {
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
    REQUESTS_ROW,
    DURATION_ROW,
    JOBS_ROW,
    MEMORY_ROW,
    QUEUE_ROW,
    PAYLOAD_ROW,
  ]);
  await pressSortKey(false, "Time ▼ Service Name Type Unit Series", [
    REQUESTS_ROW,
    JOBS_ROW,
    MEMORY_ROW,
    QUEUE_ROW,
    DURATION_ROW,
    PAYLOAD_ROW,
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

  await search("payload", [PAYLOAD_ROW]);
  await search("requests served", [REQUESTS_ROW]);
  await search("/checkout", [REQUESTS_ROW]);
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

  expect(await app.waitForSelection("http.server.requests")).toBe(REQUESTS_ROW);
  await app.waitForFrame((frame) => textLines(frame)[1] === "/http 2 of 6 metrics");
});

test("summarizes the selected metric's attribute values", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetricList(receiver);

  app.mockInput.pressArrow("down");
  const frame = await app.waitForFrame((frame) => panelLines(frame).includes("shop 1.0.0"));

  expect(panelLines(frame)).toEqual([
    "http.server.requests counter",
    "● checkout unit {request} cumulative 2 series",
    "Requests served",
    "Attributes",
    "http.route /cart, /checkout",
    "Resource",
    "service.name checkout",
    "Scope",
    "shop 1.0.0",
  ]);
});

test("lists a few attribute values and counts the rest", async () => {
  await using receiver = await startTestReceiver();
  const cores = ["0", "1", "2", "3", "4"];
  await receiver.send(
    "/v1/metrics",
    metricsRequest({
      service: "worker",
      metrics: [
        {
          name: "cpu.utilization",
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
  await using app = await openMetric(receiver, REQUESTS_ROW);

  const frame = await app.waitForFrame(
    (frame) => BRAILLE_DOTS.test(frame) && textLines(frame).includes("/checkout 2/s 50"),
  );

  expect(textLines(frame).slice(1, 7)).toEqual([
    "http.server.requests counter",
    "● checkout unit {request} cumulative 2 series",
    "Requests served",
    "http.route Rate Total",
    "/cart 10/s 250",
    "/checkout 2/s 50",
  ]);
  const panel = panelLines(frame);
  expect(panel.slice(0, 3)).toEqual(["/cart 12:00:30.000", "rate 10/s total 250", "Rate"]);
  expect(panel[3]).toStartWith("10/s ");
  expect(panel.slice(-8)).toEqual([
    "0/s",
    "12:00:00.000 now",
    "Attributes",
    "http.route /cart",
    "Resource",
    "service.name checkout",
    "Scope",
    "shop 1.0.0",
  ]);
});

test("shows the series picked in the table", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, REQUESTS_ROW);
  await app.waitForFrame((frame) => textLines(frame).includes("/checkout 2/s 50"));

  app.mockInput.pressArrow("down");
  const frame = await app.waitForFrame(
    (frame) => panelLines(frame)[0] === "/checkout 12:00:30.000",
  );

  expect(panelLines(frame)[1]).toBe("rate 2/s total 50");
});

test("adds up a delta counter's points", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, JOBS_ROW);

  const frame = await app.waitForFrame((frame) => textLines(frame).includes("none 0.5/s 12"));

  expect(textLines(frame).slice(3, 5)).toEqual(["Attributes Rate Total", "none 0.5/s 12"]);
});

test("shows the last, lowest, and highest value of gauges and updowncounters", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, MEMORY_ROW);
  let frame = await app.waitForFrame((frame) =>
    textLines(frame).includes("none 1.5 MiB 1.0 MiB 2.0 MiB"),
  );
  expect(textLines(frame).slice(3, 5)).toEqual([
    "Attributes Last Min Max",
    "none 1.5 MiB 1.0 MiB 2.0 MiB",
  ]);

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => frame.includes("6 metrics"));
  app.mockInput.pressArrow("down");
  await app.waitForSelection(QUEUE_ROW);
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
  expect(panel.slice(panel.indexOf("Exemplars"), panel.indexOf("Exemplars") + 3)).toEqual([
    "Exemplars",
    `12:00:19.000 140.0ms ${"2".repeat(32)} ${"2b".repeat(8)}`,
    "12:00:09.000 75.0ms no trace",
  ]);
});

test("shows an exponential histogram's buckets", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, PAYLOAD_ROW);

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
  await receiver.send(
    "/v1/metrics",
    metricsRequest({
      service: "checkout",
      metrics: [
        {
          name: "orders",
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
  await using app = await openMetric(receiver, JOBS_ROW);

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => frame.includes("6 metrics"));

  expect(await app.waitForSelection("jobs.completed")).toBe(JOBS_ROW);
});

test("adds up a delta updowncounter's changes", async () => {
  await using receiver = await startTestReceiver();
  await receiver.send(
    "/v1/metrics",
    metricsRequest({
      service: "checkout",
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
  await receiver.send(
    "/v1/metrics",
    metricsRequest({
      service: "checkout",
      metrics: [
        {
          name: "http.server.duration",
          unit: "ms",
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
    Array.from({ length: 30 }, (_, index) => [`label.${index + 1}`, "value"]),
  );
  await receiver.send(
    "/v1/metrics",
    metricsRequest({
      service: "checkout",
      metrics: [{ name: "queue.depth", gauge: [{ attributes, time: atSecond(10), value: 1 }] }],
    }),
  );
  await using app = await renderMetrics(receiver);
  await app.waitForFrame((frame) => panelLines(frame).includes("label.1 value"));

  app.mockInput.pressKey("d", { ctrl: true });
  await app.waitForFrame((frame) => !panelLines(frame).includes("label.1 value"));

  app.mockInput.pressKey("u", { ctrl: true });
  await app.waitForFrame((frame) => panelLines(frame).includes("label.1 value"));
});

test("scrolls the series panel down and back up", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetricList(receiver);
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
  await using app = await openMetric(receiver, JOBS_ROW);
  await app.waitForFrame((frame) => textLines(frame).includes("none 0.5/s 12"));

  const connection = await receiver.connect();
  await connection.run("DELETE FROM otlp_metrics_sum WHERE name = 'jobs.completed'");

  await app.waitForFrame((frame) => frame.includes("This metric is no longer available"));
});
