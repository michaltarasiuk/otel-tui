import { expect, type Mock, spyOn, test } from "bun:test";

import { DuckDBConnection } from "@duckdb/node-api";

import logList from "#logs/sql/log-list.sql" with { type: "text" };
import metricList from "#metrics/sql/metric-list.sql" with { type: "text" };
import serviceList from "#services/sql/service-list.sql" with { type: "text" };
import { openTab, renderApp } from "#testing/app.tsx";
import { logsRequest, STATUS_CODE, tracesRequest } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import { keyHints, onDetails, onList, tabStyles } from "#testing/screen.ts";
import traceList from "#traces/sql/trace-list.sql" with { type: "text" };

function queriesRun(runAndReadAll: Mock<DuckDBConnection["runAndReadAll"]>) {
  return runAndReadAll.mock.calls.map(([sql]) => sql);
}

test("queries only the view on screen", async () => {
  using runAndReadAll = spyOn(DuckDBConnection.prototype, "runAndReadAll");
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);

  await app.waitForFrame(() => queriesRun(runAndReadAll).includes(serviceList));
  expect(queriesRun(runAndReadAll)).not.toContain(traceList);
  expect(queriesRun(runAndReadAll)).not.toContain(metricList);
  expect(queriesRun(runAndReadAll)).not.toContain(logList);

  app.mockInput.pressArrow("right");
  await app.waitForFrame(() => queriesRun(runAndReadAll).includes(traceList));
  expect(queriesRun(runAndReadAll)).not.toContain(metricList);
  expect(queriesRun(runAndReadAll)).not.toContain(logList);
});

test("hints the view's described keys, the selected row's actions first", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "checkout",
      spans: [
        {
          traceId: "1".repeat(32),
          spanId: "1".repeat(16),
          name: "oteldemo.CheckoutService/PlaceOrder",
          start: new Date(0),
          end: new Date(10),
        },
      ],
    }),
  );
  await using app = await renderApp(receiver, { size: { width: 160, height: 10 } });
  await openTab(app, "traces");
  await app.waitForFrame((frame) => frame.includes("oteldemo.CheckoutService/PlaceOrder"));

  app.mockInput.pressTab();
  const frame = await app.waitForFrame(onList);

  expect(keyHints(frame)).toBe(
    "return open y copy id / search right range s status o sort shift+o reverse p pause tab next region ? help",
  );
});

test("hints the jump to the next error only when a trace has errors", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "checkout",
      spans: [
        {
          traceId: "1".repeat(32),
          spanId: "1".repeat(16),
          name: "oteldemo.CheckoutService/PlaceOrder",
          start: new Date(0),
          end: new Date(10),
          status: { code: STATUS_CODE.error },
        },
      ],
    }),
  );
  await using app = await renderApp(receiver, { size: { width: 160, height: 10 } });
  await openTab(app, "traces");
  await app.waitForFrame((frame) => frame.includes("oteldemo.CheckoutService/PlaceOrder"));

  app.mockInput.pressTab();
  const frame = await app.waitForFrame(onList);

  expect(keyHints(frame)).toStartWith("return open y copy id e next error / search");
});

test("follows to the traces tab when a log opens its trace", async () => {
  await using receiver = await startTestReceiver();
  const traceId = "2".repeat(32);
  const spanId = "2a".repeat(8);
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "checkout",
      spans: [
        {
          traceId,
          spanId,
          name: "oteldemo.CheckoutService/PlaceOrder",
          start: new Date(0),
          end: new Date(10),
        },
      ],
    }),
  );
  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({
      service: "checkout",
      logs: [{ time: new Date(5), body: "[PlaceOrder]", traceId, spanId }],
    }),
  );
  await using app = await renderApp(receiver);
  await openTab(app, "traces");
  await app.waitForFrame((frame) => frame.includes("oteldemo.CheckoutService/PlaceOrder"));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("[PlaceOrder]"));
  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("return open trace"));

  app.mockInput.pressEnter();

  await app.waitForFrame((frame) => frame.includes("1 span"));
  expect(tabStyles(await app.captureSpans())).toEqual({
    Services: { highlighted: false, fg: "muted" },
    Traces: { highlighted: false, fg: "text" },
    Metrics: { highlighted: false, fg: "muted" },
    Logs: { highlighted: false, fg: "muted" },
  });
});

test("forgets where a trace was opened from after switching tabs", async () => {
  await using receiver = await startTestReceiver();
  const traceId = "2".repeat(32);
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "checkout",
      spans: [
        {
          traceId,
          spanId: "2a".repeat(8),
          name: "oteldemo.CheckoutService/PlaceOrder",
          start: new Date(0),
          end: new Date(10),
        },
      ],
    }),
  );
  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({
      service: "checkout",
      logs: [{ time: new Date(5), body: "[PlaceOrder]", traceId }],
    }),
  );
  await using app = await renderApp(receiver);
  await openTab(app, "traces");
  await app.waitForFrame((frame) => frame.includes("oteldemo.CheckoutService/PlaceOrder"));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("[PlaceOrder]"));
  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("return open trace"));
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("1 span"));

  app.mockInput.pressTab({ shift: true });
  await app.waitForFrame((frame) => !onDetails(frame));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));
  app.mockInput.pressArrow("left");
  await app.waitForFrame((frame) => frame.includes("1 span"));
  app.mockInput.pressTab();
  await app.waitForFrame(onDetails);
  app.mockInput.pressEscape();

  await app.waitForFrame((frame) => frame.includes("1 trace"));
  expect(tabStyles(await app.captureSpans())).toMatchObject({
    Traces: { highlighted: false, fg: "text" },
  });
});

test("clears the telemetry with ctrl+l and starts the current tab over", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "checkout",
      spans: [
        {
          traceId: "3".repeat(32),
          spanId: "3a".repeat(8),
          name: "oteldemo.CheckoutService/PlaceOrder",
          start: new Date(0),
          end: new Date(10),
        },
      ],
    }),
  );
  await using app = await renderApp(receiver);
  await openTab(app, "traces");
  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("oteldemo.CheckoutService/PlaceOrder"));
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("1 span"));

  app.mockInput.pressKey("l", { ctrl: true });

  await app.waitForFrame((frame) => frame.includes("Waiting for traces..."));
  expect(tabStyles(await app.captureSpans())).toMatchObject({
    Traces: { highlighted: false, fg: "text" },
  });
});
