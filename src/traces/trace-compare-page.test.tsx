import { expect, test } from "bun:test";

import type { CapturedSpan } from "@opentui/core";

import { renderPage, selectRow } from "#testing/app.tsx";
import { startTestReceiver } from "#testing/receiver.ts";
import {
  color,
  detailsLines,
  keyHints,
  lineSpans,
  pageHeader,
  spanDiffRows,
  textLines,
} from "#testing/screen.ts";
import {
  CART_ROW,
  cartTraceId,
  CHECKOUT_ROW,
  GET_CART,
  otlpTraces,
  PLACE_ORDER,
  renderCartComparison,
  SLOW_CART_ROW,
  slowCartTraceId,
  slowCartTraces,
  WITH_SLOW_CART,
} from "#testing/traces.ts";
import { THEME } from "#ui/theme.ts";

const WIDE = { size: { width: 140, height: 30 } };

const ROOT_ROW = "● frontend GET /api/cart 120.0ms 300.0ms +180.0ms";
const GET_CART_ROW = `● cart ${GET_CART} 80.0ms 240.0ms +160.0ms`;
const SAME_VALKEY_ROW = "● cart valkey-cart:6379 60.0ms 60.0ms +0µs";
const ADDED_VALKEY_ROW = "● cart valkey-cart:6379 - 140.0ms added";

test("compares the marked trace with the selected one span by span", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderCartComparison(receiver, WIDE);

  const frame = await app.waitForFrame((frame) => spanDiffRows(frame).length === 4);

  expect(textLines(frame)).toContain("GET /api/cart 11111111 → 66666666");
  expect(textLines(frame)).toContain("● frontend 120.0ms → 300.0ms +180.0ms 3 → 4 spans");
  expect(spanDiffRows(frame)).toEqual([ROOT_ROW, GET_CART_ROW, SAME_VALKEY_ROW, ADDED_VALKEY_ROW]);
});

test("sums each operation's time in both traces, biggest change first", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderCartComparison(receiver, WIDE);

  const frame = await app.waitForFrame((frame) => detailsLines(frame).length > 0);

  expect(detailsLines(frame).slice(0, 4)).toEqual([
    "Service Operation Spans Before After Change -180.0ms 0 +180.0ms",
    "● frontend GET /api/cart 1 → 1 120.0ms 300.0ms +180.0ms",
    `● cart ${GET_CART} 1 → 1 80.0ms 240.0ms +160.0ms`,
    "● cart valkey-cart:6379 1 → 2 60.0ms 200.0ms +140.0ms",
  ]);
});

test("shows only the spans that changed", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderCartComparison(receiver, WIDE);

  app.mockInput.pressKey("d");
  const frame = await app.waitForFrame((frame) => spanDiffRows(frame).length === 3);

  expect(spanDiffRows(frame)).toEqual([ROOT_ROW, GET_CART_ROW, ADDED_VALKEY_ROW]);
  expect(keyHints(frame)).toContain("d all spans");
});

test("swaps the traces and keeps the selected span", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderCartComparison(receiver, WIDE);
  app.mockInput.pressKey("e");
  await app.waitForSelection("added");

  app.mockInput.pressKey("x");
  const frame = await app.waitForFrame((frame) =>
    textLines(frame).includes("GET /api/cart 66666666 → 11111111"),
  );

  expect(spanDiffRows(frame)[0]).toBe("● frontend GET /api/cart 300.0ms 120.0ms -180.0ms");
  expect(await app.waitForSelection("removed")).toBe("● cart valkey-cart:6379 140.0ms - removed");
});

test("opens a span in the trace where it took longer, then comes back", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderCartComparison(receiver, WIDE);
  app.mockInput.pressKey("x");
  await app.waitForFrame((frame) => textLines(frame).includes("GET /api/cart 66666666 → 11111111"));
  app.mockInput.pressArrow("down");
  await app.waitForSelection(GET_CART);

  app.mockInput.pressEnter();
  let frame = await app.waitForFrame((frame) =>
    textLines(frame).includes(`GET /api/cart ${slowCartTraceId}`),
  );
  expect(await app.waitForSelection(GET_CART)).toBe(`● cart ${GET_CART} 240.0ms`);

  app.mockInput.pressEscape();
  frame = await app.waitForFrame((frame) => spanDiffRows(frame).length === 4);
  expect(await app.waitForSelection(GET_CART)).toBe(`● cart ${GET_CART} 240.0ms 80.0ms -160.0ms`);

  app.mockInput.pressEscape();
  frame = await app.waitForFrame((frame) => pageHeader(frame).endsWith("4 traces"));
  expect(pageHeader(frame)).toBe("vs GET /api/cart 120.0ms 4 traces");
  expect(await app.waitForSelection("GET /api/cart 4")).toBe(SLOW_CART_ROW);
  expect(keyHints(frame)).toContain("c compare");
});

function barColors(spans: CapturedSpan[]) {
  return spans.filter((span) => span.text.trim() === "").map((span) => span.bg.toInts());
}

test("grows the bar in red when a span got slower and in blue when it got faster", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderCartComparison(receiver, WIDE);
  await app.waitForFrame((frame) => spanDiffRows(frame).length === 4);

  let frame = await app.captureSpans();
  expect(barColors(lineSpans(frame, `${GET_CART} `))).toContainEqual(color(THEME.textError));
  expect(barColors(lineSpans(frame, `${GET_CART} `))).not.toContainEqual(color(THEME.bar));

  app.mockInput.pressKey("x");
  await app.waitForFrame((frame) => textLines(frame).includes("GET /api/cart 66666666 → 11111111"));
  frame = await app.captureSpans();
  expect(barColors(lineSpans(frame, `${GET_CART} `))).toContainEqual(color(THEME.bar));
  expect(barColors(lineSpans(frame, `${GET_CART} `))).not.toContainEqual(color(THEME.textError));
});

test("offers to compare only traces with the same root span", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await receiver.sendHttp("/v1/traces", slowCartTraces);
  await using app = await renderPage(receiver, "traces", WIDE);
  await app.waitForRows(WITH_SLOW_CART);
  await selectRow(app, WITH_SLOW_CART, CART_ROW);
  app.mockInput.pressKey("m");
  await app.waitForFrame((frame) => keyHints(frame).includes("m unmark"));

  app.mockInput.pressArrow("up");
  let frame = await app.waitForFrame((frame) => keyHints(frame).includes("m mark"));
  expect(await app.waitForSelection(PLACE_ORDER)).toContain(CHECKOUT_ROW);
  expect(keyHints(frame)).not.toContain("c compare");

  app.mockInput.pressArrow("up");
  app.mockInput.pressArrow("up");
  frame = await app.waitForFrame((frame) => keyHints(frame).includes("c compare"));
  expect(await app.waitForSelection("GET /api/cart 4")).toBe(SLOW_CART_ROW);
});

test("drops the compare key when the marked trace is gone", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderCartComparison(receiver, WIDE);
  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => keyHints(frame).includes("c compare"));

  const connection = await receiver.connect();
  await connection.run("DELETE FROM otlp_traces WHERE trace_id = $traceId", {
    traceId: cartTraceId,
  });

  const frame = await app.waitForFrame((frame) => pageHeader(frame).startsWith("vs 11111111"));
  expect(keyHints(frame)).not.toContain("c compare");
});
