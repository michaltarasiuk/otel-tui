import { afterEach, expect, mock, setSystemTime, test } from "bun:test";

import { renderApp } from "#testing/app.tsx";
import { startTestReceiver } from "#testing/receiver.ts";
import { pageHeader, tableRows, textLines } from "#testing/screen.ts";

import {
  CART_ROW,
  CHECKOUT_ROW,
  NEWEST_FIRST,
  otlpTraces,
  PLACE_ORDER,
  renderTraceList,
  STATUS_ROW,
  statusTraceId,
} from "./test-traces.ts";
import {} from "./traces-histogram.tsx";

afterEach(() => {
  setSystemTime();
  mock.restore();
});

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

  const frame = await app.waitForFrame((frame) => tableRows(frame).length === 3);

  expect(textLines(frame)).toContain("3 traces");
  expect(textLines(frame)).toContain("Time ▼ Service Name Spans Errors Duration");
  expect(tableRows(frame)).toEqual(NEWEST_FIRST);
});

test("searches trace names, services, and IDs", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);

  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => frame.includes("trace name, service or ID"));
  await app.mockInput.typeText("cart");
  let frame = await app.waitForFrame((frame) => frame.includes("1 of 3 traces"));
  expect(tableRows(frame)).toEqual([CART_ROW]);

  app.mockInput.pressEnter();
  frame = await app.waitForFrame((frame) => frame.includes("/ search"));
  expect(pageHeader(frame)).toBe("/cart 1 of 3 traces");

  app.mockInput.pressEscape();
  frame = await app.waitForFrame((frame) => tableRows(frame).length === 3);
  expect(pageHeader(frame)).toBe("3 traces");

  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => frame.includes("trace name, service or ID"));
  await app.mockInput.typeText(statusTraceId.slice(0, 8));
  frame = await app.waitForFrame((frame) => frame.includes("1 of 3 traces"));
  expect(tableRows(frame)).toEqual([STATUS_ROW]);
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
  expect(pageHeader(frame)).toBe("errors only 1 of 3 traces");
  expect(tableRows(frame)).toEqual([CHECKOUT_ROW]);

  app.mockInput.pressKey("s");
  frame = await app.waitForFrame((frame) => tableRows(frame).length === 3);
  expect(frame).not.toContain("errors only");
});

test("sorts by span count, error count, duration, and time", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);

  async function nextSort(header: string, rows: string[]) {
    app.mockInput.pressKey("o");
    const frame = await app.waitForFrame((frame) => Bun.deepEquals(tableRows(frame), rows));
    expect(textLines(frame)).toContain(header);
  }

  await nextSort("Time Service Name ▼ Spans Errors Duration", [CHECKOUT_ROW, CART_ROW, STATUS_ROW]);
  await nextSort("Time Service Name Spans ▼ Errors Duration", [CHECKOUT_ROW, STATUS_ROW, CART_ROW]);
  await nextSort("Time Service Name Spans Errors ▼ Duration", [CHECKOUT_ROW, CART_ROW, STATUS_ROW]);
  await nextSort("Time ▼ Service Name Spans Errors Duration", NEWEST_FIRST);

  app.mockInput.pressKey("o", { shift: true });
  const frame = await app.waitForFrame((frame) =>
    Bun.deepEquals(tableRows(frame), [CART_ROW, CHECKOUT_ROW, STATUS_ROW]),
  );
  expect(textLines(frame)).toContain("Time ▲ Service Name Spans Errors Duration");
});

test("jumps to the next trace with errors in either direction", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);
  await app.waitForSelection(STATUS_ROW);

  app.mockInput.pressKey("e");
  expect(await app.waitForSelection(PLACE_ORDER)).toBe(CHECKOUT_ROW);

  app.mockInput.pressKey("HOME");
  await app.waitForSelection(STATUS_ROW);
  app.mockInput.pressKey("e", { shift: true });
  expect(await app.waitForSelection(PLACE_ORDER)).toBe(CHECKOUT_ROW);
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

  const frame = await app.waitForFrame((frame) => tableRows(frame).length === 1);
  expect(pageHeader(frame)).toBe("/cart 1 of 3 traces");
  expect(textLines(frame)).toContain("Time Service Name ▼ Spans Errors Duration");
  expect(tableRows(frame)).toEqual([CART_ROW]);
});

test("shows an error when traces cannot be loaded", async () => {
  await using receiver = await startTestReceiver();
  const connection = await receiver.connect();
  await connection.run("DROP TABLE otlp_traces");

  await using app = await renderApp(receiver);

  await app.waitForFrame((frame) => frame.includes("Failed to load traces"));
});
