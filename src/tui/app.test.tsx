import { expect, test } from "bun:test";

import { type CapturedFrame, RGBA } from "@opentui/core";

import { renderApp } from "../testing/app.tsx";
import { logsRequest, STATUS_CODE, tracesRequest } from "../testing/otlp.ts";
import { startTestReceiver } from "../testing/receiver.ts";
import { textLines } from "../testing/render.tsx";
import { THEME } from "./theme.ts";

const TAB_NAMES = ["Traces", "Metrics", "Logs"];

function tabStyles({ lines }: CapturedFrame) {
  const [tabBar] = lines;
  return Object.fromEntries(
    (tabBar?.spans ?? [])
      .filter((span) => TAB_NAMES.includes(span.text.trim()))
      .map((span) => [
        span.text.trim(),
        {
          highlighted: span.bg.equals(RGBA.fromHex(THEME.backgroundSelected)),
          fg: span.fg.equals(RGBA.fromHex(THEME.text)) ? "text" : "muted",
        },
      ]),
  );
}

function footer(frame: string) {
  return textLines(frame).at(-1) ?? "";
}

test("starts on the traces tab with the tab bar focused", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);

  await app.waitForFrame((frame) => frame.includes("Waiting for traces..."));

  expect(await app.waitForSelection("Traces")).toBe("Traces Metrics Logs");
  expect(tabStyles(app.captureSpans())).toEqual({
    Traces: { highlighted: true, fg: "text" },
    Metrics: { highlighted: false, fg: "muted" },
    Logs: { highlighted: false, fg: "muted" },
  });
});

test("switches tabs with the arrow keys while the tab bar is focused", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);
  await app.waitForFrame((frame) => frame.includes("Waiting for traces..."));

  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));
  expect(tabStyles(app.captureSpans())).toMatchObject({
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
  await app.waitForFrame((frame) => frame.includes("Waiting for traces..."));
  expect(footer(await app.waitForFrame((frame) => frame.includes("tab next region")))).toStartWith(
    "tab next region Listening",
  );

  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("/ search"));
  expect(tabStyles(app.captureSpans())).toMatchObject({
    Traces: { highlighted: false, fg: "text" },
  });

  app.mockInput.pressTab({ shift: true });
  await app.waitForFrame((frame) => !frame.includes("/ search"));
  expect(tabStyles(app.captureSpans())).toMatchObject({
    Traces: { highlighted: true, fg: "text" },
  });
});

test("keeps showing the current tab while the view has focus", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);
  await app.waitForFrame((frame) => frame.includes("Waiting for traces..."));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for logs..."));

  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("/ search"));

  expect(tabStyles(app.captureSpans())).toEqual({
    Traces: { highlighted: false, fg: "muted" },
    Metrics: { highlighted: false, fg: "muted" },
    Logs: { highlighted: false, fg: "text" },
  });
});

test("shows where the receiver listens in a padded footer", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);

  const frame = await app.waitForFrame((frame) => frame.includes("tab next region"));

  expect(frame.split("\n").findLast((line) => line.trim() !== "")).toMatch(
    new RegExp(`^ tab next region +Listening for OTLP/HTTP on ${receiver.url} $`),
  );
});

test("hints the view's described keys, the selected row's actions first", async () => {
  await using receiver = await startTestReceiver();
  await receiver.send(
    "/v1/traces",
    tracesRequest({
      service: "checkout",
      spans: [
        {
          traceId: "1".repeat(32),
          spanId: "1".repeat(16),
          name: "POST /checkout",
          start: new Date(0),
          end: new Date(10),
        },
      ],
    }),
  );
  await using app = await renderApp(receiver, { width: 160, height: 10 });
  await app.waitForFrame((frame) => frame.includes("POST /checkout"));

  app.mockInput.pressTab();
  const frame = await app.waitForFrame((frame) => frame.includes("/ search"));

  expect(footer(frame)).toStartWith(
    "return open / search s status o sort shift+o reverse tab next region Listening",
  );
});

test("hints the jump to the next error only when a trace has errors", async () => {
  await using receiver = await startTestReceiver();
  await receiver.send(
    "/v1/traces",
    tracesRequest({
      service: "checkout",
      spans: [
        {
          traceId: "1".repeat(32),
          spanId: "1".repeat(16),
          name: "POST /checkout",
          start: new Date(0),
          end: new Date(10),
          status: { code: STATUS_CODE.error },
        },
      ],
    }),
  );
  await using app = await renderApp(receiver, { width: 160, height: 10 });
  await app.waitForFrame((frame) => frame.includes("POST /checkout"));

  app.mockInput.pressTab();
  const frame = await app.waitForFrame((frame) => frame.includes("/ search"));

  expect(footer(frame)).toStartWith("return open e next error / search");
});

test("follows to the traces tab when a log opens its trace", async () => {
  await using receiver = await startTestReceiver();
  const traceId = "2".repeat(32);
  const spanId = "2a".repeat(8);
  await receiver.send(
    "/v1/traces",
    tracesRequest({
      service: "checkout",
      spans: [{ traceId, spanId, name: "POST /checkout", start: new Date(0), end: new Date(10) }],
    }),
  );
  await receiver.send(
    "/v1/logs",
    logsRequest({
      service: "checkout",
      logs: [{ time: new Date(5), body: "order placed", traceId, spanId }],
    }),
  );
  await using app = await renderApp(receiver);
  await app.waitForFrame((frame) => frame.includes("POST /checkout"));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("order placed"));
  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("return open trace"));

  app.mockInput.pressEnter();

  await app.waitForFrame((frame) => frame.includes("1 span"));
  expect(tabStyles(app.captureSpans())).toEqual({
    Traces: { highlighted: false, fg: "text" },
    Metrics: { highlighted: false, fg: "muted" },
    Logs: { highlighted: false, fg: "muted" },
  });
});
