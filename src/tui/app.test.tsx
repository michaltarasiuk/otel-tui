import { expect, type Mock, spyOn, test } from "bun:test";

import { DuckDBConnection } from "@duckdb/node-api";
import { type CapturedFrame, RGBA } from "@opentui/core";

import logList from "#telemetry/logs/sql/log-list.sql" with { type: "text" };
import metricList from "#telemetry/metrics/sql/metric-list.sql" with { type: "text" };
import serviceList from "#telemetry/services/sql/service-list.sql" with { type: "text" };
import traceList from "#telemetry/traces/sql/trace-list.sql" with { type: "text" };
import { renderApp, search, type TestApp } from "#testing/app.tsx";
import { logsRequest, STATUS_CODE, tracesRequest } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import { keyHints, onDetails, onList, pageHeader, selectedBackground } from "#testing/screen.ts";
import { collapseWhitespace } from "#utils/collapse-whitespace.ts";

import { THEME } from "./theme/theme.ts";

const TAB_NAMES = ["Services", "Traces", "Metrics", "Logs"];

const textForeground = RGBA.fromHex(THEME.text);

interface TabStyle {
  highlighted: boolean;
  fg: "text" | "muted";
}

function tabStyles({ lines: [tabBar] }: CapturedFrame) {
  const styles: Record<string, TabStyle> = {};
  for (const span of tabBar?.spans ?? []) {
    const name = span.text.trim();
    if (!TAB_NAMES.includes(name)) {
      continue;
    }
    styles[name] = {
      highlighted: span.bg.equals(selectedBackground),
      fg: span.fg.equals(textForeground) ? "text" : "muted",
    };
  }
  return styles;
}

function queriesRun(runAndReadAll: Mock<DuckDBConnection["runAndReadAll"]>) {
  return runAndReadAll.mock.calls.map(([sql]) => sql);
}

const WAITING_FOR_SERVICES = "Waiting for server or consumer spans...";

async function openTracesTab(app: TestApp) {
  await app.waitForFrame((frame) => / services?$/.test(pageHeader(frame)));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => / traces?$/.test(pageHeader(frame)));
}

test("starts on the services tab with the tab bar focused", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);

  await app.waitForFrame((frame) => frame.includes(WAITING_FOR_SERVICES));

  expect(await app.waitForSelection("Services")).toStartWith("Services Traces Metrics Logs ");
  expect(tabStyles(await app.captureSpans())).toEqual({
    Services: { highlighted: true, fg: "text" },
    Traces: { highlighted: false, fg: "muted" },
    Metrics: { highlighted: false, fg: "muted" },
    Logs: { highlighted: false, fg: "muted" },
  });
});

test("switches tabs with the arrow keys while the tab bar is focused", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);
  await app.waitForFrame((frame) => frame.includes(WAITING_FOR_SERVICES));

  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for traces..."));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));
  expect(tabStyles(await app.captureSpans())).toMatchObject({
    Metrics: { highlighted: true, fg: "text" },
  });

  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for logs..."));
  app.mockInput.pressArrow("left");
  await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));
});

test("moves focus between the tab bar and the view with tab and shift+tab", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);

  await app.waitForFrame((frame) => frame.includes(WAITING_FOR_SERVICES));
  expect(keyHints(await app.waitForFrame((frame) => frame.includes("tab next region")))).toBe(
    "tab next region ? help",
  );

  app.mockInput.pressTab();
  await app.waitForFrame(onList);
  expect(tabStyles(await app.captureSpans())).toMatchObject({
    Services: { highlighted: false, fg: "text" },
  });

  app.mockInput.pressTab({ shift: true });
  await app.waitForFrame((frame) => !onList(frame));
  expect(tabStyles(await app.captureSpans())).toMatchObject({
    Services: { highlighted: true, fg: "text" },
  });
});

test("keeps showing the current tab while the view has focus", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);
  await openTracesTab(app);
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for logs..."));

  app.mockInput.pressTab();
  await app.waitForFrame(onList);

  expect(tabStyles(await app.captureSpans())).toEqual({
    Services: { highlighted: false, fg: "muted" },
    Traces: { highlighted: false, fg: "muted" },
    Metrics: { highlighted: false, fg: "muted" },
    Logs: { highlighted: false, fg: "text" },
  });
});

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

test("shows where the receiver listens beside the tabs", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);

  const frame = await app.waitForFrame((frame) => frame.includes("nothing received yet"));

  expect(frame.split("\n")[0]).toMatch(
    new RegExp(
      `^ Services +Traces +Metrics +Logs +nothing received yet · OTLP/HTTP ${new URL(receiver.urls.http).host} · OTLP/gRPC ${new URL(receiver.urls.grpc).host} $`,
    ),
  );
  expect(keyHints(frame)).toBe("tab next region ? help");
});

test("counts the items received and says when the last arrived", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);
  await app.waitForFrame((frame) => frame.includes("nothing received yet"));

  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({
      service: "checkout",
      logs: [
        { time: new Date(0), body: "[PlaceOrder]" },
        { time: new Date(1), body: "payment went through" },
      ],
    }),
  );

  const frame = await app.waitForFrame((frame) => frame.includes("2 items received"));
  expect(frame.split("\n")[0]).toMatch(/2 items received (just now|\d+s ago) · OTLP\/HTTP/);
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
  await openTracesTab(app);
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
  await openTracesTab(app);
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
  await openTracesTab(app);
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
  await openTracesTab(app);
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
  await openTracesTab(app);
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

test("lists every key of the focused page in a help overlay", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);
  await openTracesTab(app);
  app.mockInput.pressTab();
  await app.waitForFrame(onList);

  app.mockInput.pressKey("?");

  const frame = await app.waitForFrame((frame) => frame.includes("Keys"));
  for (const line of [
    "/ search",
    "s status",
    "shift+o reverse",
    "shift+tab previous region",
    "ctrl+l clear telemetry",
  ]) {
    expect(collapseWhitespace(frame)).toContain(line);
  }

  app.mockInput.pressEscape();
  await app.waitForFrame(
    (frame) => !frame.includes("Keys") && keyHints(frame).includes("/ search"),
  );
});

test("types ? into the search instead of opening help", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);
  await openTracesTab(app);
  app.mockInput.pressTab();
  await app.waitForFrame(onList);
  await search(app, "?");

  const frame = await app.waitForFrame((frame) => frame.includes("/?"));
  expect(frame).not.toContain("Keys");
});

function lineOf(frame: string, text: string) {
  return frame.split("\n").findIndex((line) => line.includes(text));
}

test("switches tabs and selects rows with the mouse", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "checkout",
      spans: ["1", "2"].map((digit, index) => ({
        traceId: digit.repeat(32),
        spanId: digit.repeat(16),
        name: `request ${digit}`,
        start: new Date(index),
        end: new Date(index + 10),
      })),
    }),
  );
  await using app = await renderApp(receiver);
  await app.waitForFrame((frame) => / services?$/.test(pageHeader(frame)));

  await app.mockMouse.click(12, 0);
  let frame = await app.waitForFrame(
    (frame) => frame.includes("Traces over time") && frame.includes("request 1"),
  );
  expect(tabStyles(await app.captureSpans())).toMatchObject({
    Traces: { highlighted: true, fg: "text" },
  });

  await app.mockMouse.click(30, lineOf(frame, "request 1"));

  expect(await app.waitForSelection("request 1")).toContain("checkout");
  frame = await app.waitForFrame((frame) => keyHints(frame).includes("/ search"));
  expect(tabStyles(await app.captureSpans())).toMatchObject({
    Traces: { highlighted: false, fg: "text" },
  });
});
