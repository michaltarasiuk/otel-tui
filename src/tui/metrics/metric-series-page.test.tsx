import { afterEach, beforeEach, expect, setSystemTime, test } from "bun:test";

import { renderPage } from "#testing/app.tsx";
import { atSecond } from "#testing/clock.ts";
import {
  BODY_SIZE_ROW,
  BY_NAME,
  DETAILS_SIZE,
  DURATION_ROW,
  FLAG_REQUESTS_ROW,
  HEAP_ROW,
  ITEMS_SHIPPED_ROW,
  openMetric,
  renderMetricList,
  THREADS_ROW,
} from "#testing/metrics.ts";
import { metricsRequest, TEMPORALITY } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import { CHART_DOTS, detailsLines, keyHints, tableRows, textLines } from "#testing/screen.ts";
import { otlpTraces } from "#testing/traces.ts";

beforeEach(() => {
  setSystemTime(atSecond(60));
});

afterEach(() => {
  setSystemTime();
});

test("opens a counter's series with their rates and totals", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, FLAG_REQUESTS_ROW);

  const frame = await app.waitForFrame(
    (frame) => CHART_DOTS.test(frame) && textLines(frame).includes("failedReadinessProbe 2/s 50"),
  );

  expect(textLines(frame).slice(1, 7)).toEqual([
    "feature_flag.evaluation_requests_total counter",
    "● cart unit {request} cumulative 2 series",
    "feature flag evaluation request counter",
    "feature_flag.key Rate Total",
    "cartFailure 10/s 250",
    "failedReadinessProbe 2/s 50",
  ]);

  const panel = detailsLines(frame);
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
    (frame) => detailsLines(frame)[0] === "failedReadinessProbe 12:00:30.000",
  );

  expect(detailsLines(frame)[1]).toBe("rate 2/s total 50");
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
  expect(detailsLines(frame)[1]).toBe("last 8 min 3 max 8");
});

test("shows a histogram's percentiles, buckets, and exemplars", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, DURATION_ROW);

  const frame = await app.waitForFrame(
    (frame) =>
      frame.includes("Exemplars") &&
      CHART_DOTS.test(frame) &&
      textLines(frame).includes("none 10 42.0ms 125.0ms 145.0ms 150.0ms"),
  );

  expect(textLines(frame).slice(3, 5)).toEqual([
    "Attributes Count p50 p95 p99 Max",
    "none 10 42.0ms 125.0ms 145.0ms 150.0ms",
  ]);

  const panel = detailsLines(frame);
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
    `12:00:19.000 140.0ms ${"2".repeat(32)} ${"2b".repeat(8)} (not stored)`,
    "12:00:09.000 75.0ms no trace",
  ]);
});

test("shows an exponential histogram's buckets", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, BODY_SIZE_ROW);

  const frame = await app.waitForFrame((frame) => frame.includes("Buckets"));

  expect(detailsLines(frame)[1]).toBe("count 6 p50 1.3 KiB p95 1.9 KiB p99 2.0 KiB max");
  expect(
    detailsLines(frame)
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
  await using app = await renderPage(receiver, "metrics", { size: DETAILS_SIZE });
  await app.waitForFrame((frame) => tableRows(frame).length === 1);

  app.mockInput.pressEnter();

  const frame = await app.waitForFrame((frame) => frame.includes("Not enough data points"));
  expect(detailsLines(frame).slice(0, 2)).toEqual(["no attributes 12:00:10.000", "rate total 5"]);
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
  await using app = await renderPage(receiver, "metrics", { size: DETAILS_SIZE });
  await app.waitForFrame((frame) => tableRows(frame).length === 1);

  app.mockInput.pressEnter();

  const frame = await app.waitForFrame(
    (frame) => CHART_DOTS.test(frame) && textLines(frame).includes("none 4 1 4"),
  );
  const panel = detailsLines(frame);
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
  await using app = await renderPage(receiver, "metrics", { size: DETAILS_SIZE });
  await app.waitForFrame((frame) => tableRows(frame).length === 1);

  app.mockInput.pressEnter();

  const frame = await app.waitForFrame((frame) => textLines(frame).includes("none 5"));
  expect(detailsLines(frame).slice(0, 2)).toEqual([
    "no attributes 12:00:20.000",
    "count 5 p50 p95 p99 max",
  ]);
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
    (frame) => detailsLines(frame).includes("Exemplars") && CHART_DOTS.test(frame),
  );

  app.mockInput.pressKey("d", { ctrl: true });
  await app.waitForFrame((frame) => !detailsLines(frame).includes("Percentiles"));

  app.mockInput.pressKey("u", { ctrl: true });
  await app.waitForFrame((frame) => detailsLines(frame).includes("Percentiles"));
});

test("says when an open metric is no longer available", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, ITEMS_SHIPPED_ROW);
  await app.waitForFrame((frame) => textLines(frame).includes("none 0.5/s 12"));

  const connection = await receiver.connect();
  await connection.run("DELETE FROM otlp_metrics_sum WHERE name = 'demo.shipping.items_shipped'");

  await app.waitForFrame((frame) => frame.includes("This metric is no longer available"));
});

test("opens an exemplar's trace from the exemplars region and comes back", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await using app = await openMetric(receiver, DURATION_ROW);
  await app.waitForFrame((frame) => detailsLines(frame).includes("Exemplars"));
  expect(keyHints(await app.waitForFrame(() => true))).not.toContain("open trace");

  app.mockInput.pressTab();
  await app.waitForFrame((frame) => keyHints(frame).includes("return open trace"));
  app.mockInput.pressEnter();

  expect(await app.waitForSelection("charge")).toBe("● payment charge 300.0ms");
  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => frame.includes("http.server.request.duration"));
  expect(keyHints(await app.waitForFrame(() => true))).toContain("return open trace");

  app.mockInput.pressTab();
  await app.waitForFrame((frame) => keyHints(frame) === "tab next region ? help");
});

test("moves into the exemplars when one is clicked", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await using app = await openMetric(receiver, DURATION_ROW);
  const frame = await app.waitForFrame((frame) => detailsLines(frame).includes("Exemplars"));
  const exemplarLine = frame.split("\n").findIndex((line) => line.includes("2b2b2b2b"));

  await app.mockMouse.click(20, exemplarLine);

  await app.waitForFrame((frame) => keyHints(frame).includes("return open trace"));
});

test("narrows the chart to a shorter window and back", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openMetric(receiver, ITEMS_SHIPPED_ROW);
  await app.waitForFrame((frame) => detailsLines(frame).includes("Rate"));

  app.mockInput.pressKey("w");
  await app.waitForFrame((frame) => detailsLines(frame).includes("Rate · last 15 min"));
  app.mockInput.pressKey("w");
  await app.waitForFrame((frame) => detailsLines(frame).includes("Rate · last 5 min"));
  app.mockInput.pressKey("w", { shift: true });

  await app.waitForFrame((frame) => detailsLines(frame).includes("Rate · last 15 min"));
});
