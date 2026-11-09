import { beforeEach, expect, test } from "bun:test";

import { renderPage, search } from "#testing/app.tsx";
import { atSecond, fakeClock } from "#testing/clock.ts";
import {
  BODY_SIZE_ROW,
  BY_NAME,
  DURATION_ROW,
  FLAG_REQUESTS_ROW,
  HEAP_ROW,
  ITEMS_SHIPPED_ROW,
  renderMetricList,
  THREADS_ROW,
} from "#testing/metrics.ts";
import { metricsRequest } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import { detailsLines, onList, pageHeader, tableRows, textLines } from "#testing/screen.ts";

beforeEach(() => {
  fakeClock(atSecond(60));
});

test("waits for metrics before any arrive", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderPage(receiver, "metrics");

  const frame = await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));

  expect(frame).toContain("0 metrics");
});

test("lists metrics by name with their type, unit, and series count", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetricList(receiver);

  const frame = await app.waitForFrame((frame) => frame.includes("6 metrics"));

  expect(textLines(frame)).toContain("Time Service Name ▲ Type Unit Series");
  expect(tableRows(frame)).toEqual(BY_NAME);
});

test("sorts by series count, last update, and name", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetricList(receiver);

  async function pressSortKey(shift: boolean, header: string, rows: string[]) {
    app.mockInput.pressKey("o", { shift });
    const frame = await app.waitForRows(rows);
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

  async function expectSearch(text: string, rows: string[]) {
    await search(app, text);
    const frame = await app.waitForRows(rows);
    expect(frame).toContain(`${rows.length} of 6 metrics`);
    app.mockInput.pressEscape();
    await app.waitForFrame((frame) => tableRows(frame).length === 6);
  }

  await expectSearch("body", [BODY_SIZE_ROW]);
  await expectSearch("evaluation request counter", [FLAG_REQUESTS_ROW]);
  await expectSearch("failedReadinessProbe", [FLAG_REQUESTS_ROW]);
});

test("filters metrics by an attribute", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetricList(receiver);

  await search(app, "feature_flag.key=cartFailure");

  const frame = await app.waitForRows([FLAG_REQUESTS_ROW]);
  expect(frame).toContain("1 of 6 metrics");
});

test("keeps an applied search while browsing", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetricList(receiver);

  await search(app, "http");
  await app.waitForFrame((frame) => tableRows(frame).length === 2);
  app.mockInput.pressEnter();
  await app.waitForFrame(onList);

  app.mockInput.pressArrow("down");

  expect(await app.waitForSelection("http.server.request.duration")).toBe(DURATION_ROW);
  await app.waitForFrame((frame) => pageHeader(frame) === "/http 2 of 6 metrics");
});

test("summarizes the selected metric's attribute values", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMetricList(receiver);

  app.mockInput.pressArrow("down");
  const frame = await app.waitForFrame((frame) =>
    detailsLines(frame).includes("OpenFeature 2.14.1.0"),
  );

  expect(detailsLines(frame)).toEqual([
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
  await using app = await renderPage(receiver, "metrics");

  const frame = await app.waitForFrame((frame) => frame.includes("Attributes"));

  expect(detailsLines(frame)).toContain("cpu 0, 1, 2 and 2 more");
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
  await using app = await renderPage(receiver, "metrics");
  await app.waitForFrame((frame) => detailsLines(frame).includes("demo.product.id.1 0PUK6V6EV0"));

  app.mockInput.pressKey("d", { ctrl: true });
  await app.waitForFrame((frame) => !detailsLines(frame).includes("demo.product.id.1 0PUK6V6EV0"));

  app.mockInput.pressKey("u", { ctrl: true });
  await app.waitForFrame((frame) => detailsLines(frame).includes("demo.product.id.1 0PUK6V6EV0"));
});

test("shows an error when metrics cannot be loaded", async () => {
  await using receiver = await startTestReceiver();
  const connection = await receiver.connect();
  await connection.run("DROP TABLE otlp_metrics_gauge");

  await using app = await renderPage(receiver, "metrics");

  await app.waitForFrame((frame) => frame.includes("Failed to load metrics"));
});
