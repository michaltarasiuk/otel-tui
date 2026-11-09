import { expect, test } from "bun:test";

import { renderPage, selectRow } from "#testing/app.tsx";
import { at, fakeClock } from "#testing/clock.ts";
import { JSON_ROW, NEWEST_FIRST, renderLogList } from "#testing/logs.ts";
import { logsRequest } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import { detailsLines } from "#testing/screen.ts";
import { checkoutTraceId, placeOrderSpanId } from "#testing/traces.ts";
import { GESTURE_PAUSE_MS } from "#tui/components/use-scroll-gesture.ts";

test("shows the selected log's body, attributes, resource, and scope", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  app.mockInput.pressKey("END");
  const frame = await app.waitForFrame((frame) =>
    detailsLines(frame).includes("user_currency USD"),
  );

  expect(detailsLines(frame)).toEqual([
    `INFO ● checkout 12:00:00.000 ${checkoutTraceId} ${placeOrderSpanId}`,
    "Body",
    "[PlaceOrder]",
    "Attributes",
    "user_currency USD",
    "Resource",
    "host.name colima",
    "service.name checkout",
    "Scope",
    "checkout",
  ]);
});

test("pretty-prints a JSON body", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  await selectRow(app, NEWEST_FIRST, JSON_ROW);
  const frame = await app.waitForFrame((frame) =>
    frame.includes('"http.response.status_code": 200'),
  );

  expect(detailsLines(frame)).toEqual([
    "DEBUG ● frontend 12:00:03.000",
    "Body",
    "{",
    '"url.path": "/api/cart",',
    '"http.response.status_code": 200',
    "}",
    "Resource",
    "service.name frontend",
  ]);
});

test("scrolls the log panel down and back up", async () => {
  await using receiver = await startTestReceiver();
  const body = [
    "java.lang.OutOfMemoryError: Java heap space",
    ...Array.from(
      { length: 40 },
      (_, index) => `at oteldemo.AdService$AdServiceImpl.getAds(AdService.java:${index + 200})`,
    ),
  ].join("\n");
  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({ service: "ad", logs: [{ time: at(0), body }] }),
  );
  await using app = await renderPage(receiver, "logs");
  await app.waitForFrame(
    (frame) =>
      frame.includes("Logs over time") &&
      detailsLines(frame).includes("java.lang.OutOfMemoryError: Java heap space"),
  );

  app.mockInput.pressKey("d", { ctrl: true });
  await app.waitForFrame(
    (frame) => !detailsLines(frame).includes("java.lang.OutOfMemoryError: Java heap space"),
  );

  app.mockInput.pressKey("u", { ctrl: true });
  await app.waitForFrame((frame) =>
    detailsLines(frame).includes("java.lang.OutOfMemoryError: Java heap space"),
  );
});

test("scrolls the log panel only once the list's scroll gesture pauses", async () => {
  const clock = fakeClock(at(10_000));
  await using receiver = await startTestReceiver();
  const body = [
    "java.lang.OutOfMemoryError: Java heap space",
    ...Array.from({ length: 40 }, (_, index) => `at AdService.java:${index + 200}`),
  ].join("\n");
  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({ service: "ad", logs: [{ time: at(0), body }] }),
  );
  await using app = await renderPage(receiver, "logs");
  const lines = (
    await app.waitForFrame(
      (frame) => frame.includes("Logs over time") && detailsLines(frame).includes("Body"),
    )
  ).split("\n");
  const listLine = lines.findIndex((line) => line.includes("● ad"));
  const panelLine = lines.findIndex((line) => line.includes("at AdService.java:200"));
  const panelColumn = lines[panelLine]!.indexOf("at AdService.java:200");

  await app.mockMouse.scroll(2, listLine, "down");
  await app.mockMouse.scroll(panelColumn, panelLine, "down");
  expect(detailsLines(await app.waitForFrame((frame) => frame.includes("Body")))).toContain("Body");

  clock.advance(GESTURE_PAUSE_MS + 1);
  await app.mockMouse.scroll(panelColumn, panelLine, "down");
  await app.waitForFrame((frame) => !detailsLines(frame).includes("Body"));
});
