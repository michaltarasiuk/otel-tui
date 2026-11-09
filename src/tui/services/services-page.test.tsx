import { afterEach, beforeEach, expect, setSystemTime, test } from "bun:test";

import { renderPage } from "#testing/app.tsx";
import { at } from "#testing/clock.ts";
import { startTestReceiver, type TestReceiver } from "#testing/receiver.ts";
import { detailsLines, keyHints, pageHeader, textLines } from "#testing/screen.ts";
import { otlpTraces, PLACE_ORDER } from "#testing/traces.ts";

const CART_ROW = "● cart 0.2/min 0.0% 80.0ms 80.0ms 80.0ms 1";
const CHECKOUT_ROW = "● checkout 0.2/min 100.0% 450.0ms 450.0ms 450.0ms 1";
const FRAUD_ROW = "● fraud-detection 0.2/min 0.0% 40.0ms 40.0ms 40.0ms 1";
const FRONTEND_ROW = "● frontend 0.2/min 0.0% 120.0ms 120.0ms 120.0ms 1";

beforeEach(() => {
  setSystemTime(at(60_000));
});

afterEach(() => {
  setSystemTime();
});

function serviceRows(frame: string) {
  const lines = textLines(frame);
  const header = lines.findIndex((line) => line.startsWith("Service"));
  return lines
    .slice(header + 1)
    .filter((line) => line.startsWith("● "))
    .slice(0, 4);
}

async function renderServices(receiver: TestReceiver) {
  await receiver.sendHttp("/v1/traces", otlpTraces);
  const app = await renderPage(receiver, "services");
  await app.waitForFrame((frame) => serviceRows(frame).length === 4);
  return app;
}

test("waits for server or consumer spans", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderPage(receiver, "services");

  const frame = await app.waitForFrame((frame) =>
    frame.includes("Waiting for server or consumer spans..."),
  );
  expect(pageHeader(frame)).toBe("last 5 min 0 services");
});

test("lists each service's rate, errors, and latency from its entry spans", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderServices(receiver);

  const frame = await app.waitForFrame(() => true);

  expect(pageHeader(frame)).toBe("last 5 min 4 services");
  expect(textLines(frame)).toContain("Service ▼ Rate Errors p50 p95 p99 Spans");
  expect(serviceRows(frame)).toEqual([CART_ROW, CHECKOUT_ROW, FRAUD_ROW, FRONTEND_ROW]);
});

test("sorts by errors and by p95", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderServices(receiver);

  app.mockInput.pressKey("o");
  let frame = await app.waitForFrame((frame) => serviceRows(frame)[0] === CHECKOUT_ROW);
  expect(textLines(frame)).toContain("Service Rate ▼ Errors p50 p95 p99 Spans");

  app.mockInput.pressKey("o");
  frame = await app.waitForFrame((frame) =>
    Bun.deepEquals(serviceRows(frame), [CHECKOUT_ROW, FRONTEND_ROW, CART_ROW, FRAUD_ROW]),
  );
  expect(textLines(frame)).toContain("Service Rate Errors p50 ▼ p95 p99 Spans");
});

test("shows the selected service's operations", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderServices(receiver);

  app.mockInput.pressArrow("down");

  const frame = await app.waitForFrame((frame) => detailsLines(frame).length === 3);
  expect(detailsLines(frame)).toEqual([
    "● checkout server and consumer spans",
    "Operation Rate Errors p50 p95 p99 Spans",
    `${PLACE_ORDER} 0.2/min 100.0% 450.0ms 450.0ms 450.0ms 1`,
  ]);
});

test("opens an operation's traces, slowest first, at the operation's span", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderServices(receiver);
  app.mockInput.pressArrow("down");
  app.mockInput.pressArrow("down");
  await app.waitForSelection("fraud-detection");

  app.mockInput.pressTab();
  await app.waitForSelection("orders process");
  app.mockInput.pressEnter();

  let frame = await app.waitForFrame((frame) => pageHeader(frame).endsWith("1 of 3 traces"));
  expect(pageHeader(frame)).toBe("● fraud-detection orders process 1 of 3 traces");
  expect(textLines(frame)).toContain("Time Service Name Spans Errors ▼ Duration");

  app.mockInput.pressEnter();
  frame = await app.waitForFrame((frame) => frame.includes("escape back"));
  expect(await app.waitForSelection("orders process")).toContain("orders process");

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => pageHeader(frame).endsWith("1 of 3 traces"));
  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => pageHeader(frame) === "last 5 min 4 services");
});

test("moves between services and operations with tab", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderServices(receiver);
  await app.waitForSelection("cart");

  app.mockInput.pressTab();
  let frame = await app.waitForFrame((frame) => !keyHints(frame).includes("o sort"));
  expect(keyHints(frame)).toContain("return traces");

  app.mockInput.pressTab({ shift: true });
  frame = await app.waitForFrame((frame) => keyHints(frame).includes("o sort"));
  expect(keyHints(frame)).toContain("return traces");
});

test("opens the selected service's traces and comes back", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderServices(receiver);
  await app.waitForSelection("cart");

  app.mockInput.pressEnter();

  const frame = await app.waitForFrame((frame) => pageHeader(frame).endsWith("1 of 3 traces"));
  expect(pageHeader(frame)).toBe("● cart 1 of 3 traces");
  expect(keyHints(frame)).toContain("escape back");

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => pageHeader(frame) === "last 5 min 4 services");
});
