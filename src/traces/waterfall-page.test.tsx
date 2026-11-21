import { expect, test } from "bun:test";

import { at, fakeClock } from "#testing/clock.ts";
import { logsRequest, SEVERITY_NUMBER } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import {
  color,
  detailsLines,
  keyHints,
  lineSpans,
  onDetails,
  pageHeader,
  spanColors,
  spanRows,
  tableRows,
  textLines,
} from "#testing/screen.ts";
import {
  CART_ROW,
  cartTraceId,
  CHARGE_DECLINED,
  CHARGE_FAILED,
  CHECKOUT_ROW,
  checkoutTraceId,
  openTrace,
  PLACE_ORDER,
  renderTraceList,
  STATUS_ROW,
} from "#testing/traces.ts";
import { THEME } from "#ui/theme.ts";
import { GESTURE_PAUSE_MS } from "#ui/use-scroll-gesture.ts";
import { collapseWhitespace } from "#utils/text.ts";

test("draws the waterfall on the frame the trace first shows", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);
  await app.selectRow(CART_ROW);

  app.mockInput.pressEnter();
  const frame = await app.waitForFrame(onDetails);

  expect(spanRows(frame)).toHaveLength(3);
});

test("clips the spans that don't fit on the frame the trace first shows", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver, { size: { width: 120, height: 10 } });
  await app.selectRow(CART_ROW);

  app.mockInput.pressEnter();
  const frame = await app.waitForText("3 spans");

  const rows = spanRows(frame).map((row) => collapseWhitespace(row.replace("█", "")));
  expect(rows).toEqual([
    "● frontend GET /api/cart 120.0ms",
    "● cart POST /oteldemo...tService/GetCart 80.0ms",
  ]);
});

test("jumps between spans with errors", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);
  await app.waitForFrame((frame) => detailsLines(frame).includes(CHARGE_FAILED));

  app.mockInput.pressKey("e");
  await app.waitForFrame((frame) => detailsLines(frame).includes(CHARGE_DECLINED));
  app.mockInput.pressKey("e");
  await app.waitForFrame((frame) => detailsLines(frame).includes(CHARGE_FAILED));
  app.mockInput.pressKey("e", { shift: true });
  await app.waitForFrame((frame) => detailsLines(frame).includes(CHARGE_DECLINED));

  expect(await app.waitForSelection("charge")).toBe("● payment charge 300.0ms");
});

test("dims the spans that don't match a search", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);
  await app.waitForSelection("GET /api/cart");

  await app.search("db.system=redis");
  await app.waitForText("1 of 3 spans");

  const frame = await app.captureSpans();
  expect(spanColors(lineSpans(frame, "valkey-cart"), "valkey-cart").fg).toEqual(color(THEME.text));
  expect(spanColors(lineSpans(frame, "POST /oteldemo"), "POST /oteldemo").fg).toEqual(
    color(THEME.textMuted),
  );
});

test("jumps to the first match when the search applies", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);
  await app.waitForSelection(PLACE_ORDER);

  await app.search("orders");
  await app.waitForText("1 of 3 spans");
  app.mockInput.pressEnter();

  expect(await app.waitForSelection("orders process")).toContain("orders process");
});

test("jumps between the matches", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);
  await app.waitForSelection(PLACE_ORDER);
  await app.search("card info is invalid");
  await app.waitForText("2 of 3 spans");
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => keyHints(frame).includes("n next match"));

  app.mockInput.pressKey("n");
  expect(await app.waitForSelection("charge")).toBe("● payment charge 300.0ms");
  app.mockInput.pressKey("n");
  expect(await app.waitForSelection(PLACE_ORDER)).toContain(PLACE_ORDER);
  app.mockInput.pressKey("n", { shift: true });
  expect(await app.waitForSelection("charge")).toBe("● payment charge 300.0ms");
});

test("matches span attribute values as text", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);
  await app.waitForSelection("GET /api/cart");

  await app.search("redis");

  await app.waitForText("1 of 3 spans");
  app.mockInput.pressEnter();

  expect(await app.waitForSelection("valkey-cart")).toBe("● cart valkey-cart:6379 60.0ms");
});

test("keeps the spans in place while typing a search", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);
  const before = await app.waitForText("valkey-cart:6379");

  await app.search("valkey");
  const after = await app.waitForText("1 of 3 spans");

  expect(spanRows(after)).toEqual(spanRows(before));
  expect(after.split("\n").findIndex((line) => line.includes("valkey-cart:6379"))).toBe(
    before.split("\n").findIndex((line) => line.includes("valkey-cart:6379")),
  );
});

test("keeps room for the search on a narrow terminal", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);
  await app.waitForText("charge");
  app.resize(50, 20);

  await app.search("charge");

  const frame = await app.waitForText("2 of 3 spans");
  expect(frame).toContain("/charge");
});

test("unfolds a span to jump to the match inside it", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);
  await app.waitForSelection("GET /api/cart");
  app.mockInput.pressKey(" ");
  await app.waitForFrame((frame) => spanRows(frame).length === 1);

  await app.search("valkey");
  app.mockInput.pressEnter();

  expect(await app.waitForSelection("valkey-cart")).toBe("● cart valkey-cart:6379 60.0ms");
  expect(spanRows(await app.waitForFrame((frame) => spanRows(frame).length === 3))).toHaveLength(3);
});

test("clears the search before going back to the list", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);
  await app.search("valkey");
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => keyHints(frame).includes("escape clear"));

  app.mockInput.pressEscape();
  const frame = await app.waitForFrame((frame) => keyHints(frame).includes("escape back"));
  expect(frame).not.toContain("1 of 3 spans");

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => tableRows(frame).length === 3);
});

test("goes back to the list with the opened trace still selected", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => tableRows(frame).length === 3);

  expect(await app.waitForSelection(PLACE_ORDER)).toBe(CHECKOUT_ROW);
});

test("leaves the opened trace alone while the list's scroll gesture continues", async () => {
  const clock = fakeClock(at(10_000));
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);
  const listLine = (await app.waitForText("Traces over time"))
    .split("\n")
    .findIndex((line) => collapseWhitespace(line) === STATUS_ROW);

  await app.mockMouse.scroll(2, listLine, "down");
  expect(await app.waitForSelection(PLACE_ORDER)).toBe(CHECKOUT_ROW);
  app.mockInput.pressEnter();
  const spanLine = (await app.waitForFrame((frame) => spanRows(frame).length === 3))
    .split("\n")
    .findIndex((line) => line.includes("● checkout") && line.includes(PLACE_ORDER));

  await app.mockMouse.scroll(2, spanLine, "down");
  expect(await app.waitForSelection(PLACE_ORDER)).toContain(PLACE_ORDER);

  clock.advance(GESTURE_PAUSE_MS + 1);
  await app.mockMouse.scroll(2, spanLine, "down");
  expect(await app.waitForSelection("charge")).toContain("charge");
});

const checkoutLogs = logsRequest(
  {
    service: "checkout",
    logs: [
      {
        time: at(1100),
        severityNumber: SEVERITY_NUMBER.info,
        body: "[PlaceOrder]",
        traceId: checkoutTraceId,
        spanId: "2a".repeat(8),
      },
      {
        time: at(1900),
        severityNumber: SEVERITY_NUMBER.info,
        body: 'starting to listen on tcp: "[::]:5050"',
      },
    ],
  },
  {
    service: "payment",
    logs: [
      {
        time: at(1200),
        severityNumber: SEVERITY_NUMBER.error,
        body: "Credit card info is invalid.",
        traceId: checkoutTraceId,
        spanId: "2b".repeat(8),
      },
    ],
  },
);

test("opens the logs of the open trace in the logs view", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/logs", checkoutLogs);
  await using app = await openTrace(receiver, CHECKOUT_ROW);

  app.mockInput.pressKey("l");

  const frame = await app.waitForText("[PlaceOrder]");
  expect(pageHeader(frame)).toBe("trace 22222222 2 of 3 logs");
  expect(frame).toContain("Credit card info is invalid.");
  expect(frame).not.toContain("starting to listen on tcp");
});

test("opens the logs of the selected span", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/logs", checkoutLogs);
  await using app = await openTrace(receiver, CHECKOUT_ROW);
  await app.waitForSelection(PLACE_ORDER);
  app.mockInput.pressArrow("down");
  await app.waitForSelection("charge");

  app.mockInput.pressKey("l", { shift: true });

  const frame = await app.waitForFrame((frame) => pageHeader(frame).endsWith(" logs"));
  expect(pageHeader(frame)).toBe(`trace 22222222 span ${"2b".repeat(4)} 1 of 3 logs`);
  expect(frame).toContain("Credit card info is invalid.");
  expect(frame).not.toContain("[PlaceOrder]");
});

test("comes back from the span's logs to the same span", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/logs", checkoutLogs);
  await using app = await openTrace(receiver, CHECKOUT_ROW);
  await app.waitForSelection(PLACE_ORDER);
  app.mockInput.pressArrow("down");
  await app.waitForSelection("charge");
  app.mockInput.pressKey("l", { shift: true });
  await app.waitForText("span 2b2b2b2b");

  app.mockInput.pressEscape();

  expect(await app.waitForSelection("charge")).toBe("● payment charge 300.0ms");
});

test("goes back from the trace's logs to the trace, then to the list", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({
      service: "checkout",
      logs: [{ time: at(1100), body: "[PlaceOrder]", traceId: checkoutTraceId }],
    }),
  );
  await using app = await openTrace(receiver, CHECKOUT_ROW);

  app.mockInput.pressKey("l");
  let frame = await app.waitForText("[PlaceOrder]");
  expect(keyHints(frame)).toContain("escape back");

  app.mockInput.pressEscape();
  frame = await app.waitForFrame((frame) =>
    textLines(frame).includes(`${PLACE_ORDER} ${checkoutTraceId}`),
  );
  expect(frame).not.toContain("[PlaceOrder]");

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => tableRows(frame).length === 3);
  expect(await app.waitForSelection(PLACE_ORDER)).toBe(CHECKOUT_ROW);
});

test("says when an open trace is no longer available", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);
  await app.waitForText("valkey-cart:6379");

  const connection = await receiver.connect();
  await connection.run("DELETE FROM otlp_traces WHERE trace_id = $traceId", {
    traceId: cartTraceId,
  });

  await app.waitForText("This trace is no longer available");
});

test("copies the selected span's ID and the trace's ID", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);
  await app.waitForFrame((frame) => keyHints(frame).includes("y copy id"));

  app.mockInput.pressKey("y");
  await app.waitForFrame((frame) => keyHints(frame).includes("y copied"));
  app.mockInput.pressKey("y", { shift: true });
  await app.waitForFrame(() => app.copied.length === 2);

  expect(app.copied).toEqual(["1a".repeat(8), cartTraceId]);
});
