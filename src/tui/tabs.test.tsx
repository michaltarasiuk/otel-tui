import { expect, test } from "bun:test";

import { openTab, renderApp } from "#testing/app.tsx";
import { tracesRequest } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import { keyHints, onList, pageHeader, tabStyles } from "#testing/screen.ts";

const WAITING_FOR_SERVICES = "Waiting for server or consumer spans...";

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
  await openTab(app, "traces");
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
