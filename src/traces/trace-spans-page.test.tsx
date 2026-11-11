import { expect, test } from "bun:test";

import { at, fakeClock } from "#testing/clock.ts";
import { logsRequest, SEVERITY_NUMBER } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import {
  detailsLines,
  keyHints,
  pageHeader,
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
import { GESTURE_PAUSE_MS } from "#ui/use-scroll-gesture.ts";
import { collapseWhitespace } from "#utils/text.ts";

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
  const listLine = (await app.waitForFrame((frame) => frame.includes("Traces over time")))
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

  const frame = await app.waitForFrame((frame) => frame.includes("[PlaceOrder]"));
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
  await app.waitForFrame((frame) => frame.includes("span 2b2b2b2b"));

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
  let frame = await app.waitForFrame((frame) => frame.includes("[PlaceOrder]"));
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
  await app.waitForFrame((frame) => frame.includes("valkey-cart:6379"));

  const connection = await receiver.connect();
  await connection.run("DELETE FROM otlp_traces WHERE trace_id = $traceId", {
    traceId: cartTraceId,
  });

  await app.waitForFrame((frame) => frame.includes("This trace is no longer available"));
});

test("copies the selected span's ID and the trace's ID", async () => {
  await using receiver = await startTestReceiver();
  const copied: string[] = [];
  await using app = await openTrace(receiver, CART_ROW, { copied });
  await app.waitForFrame((frame) => keyHints(frame).includes("y copy id"));

  app.mockInput.pressKey("y");
  await app.waitForFrame((frame) => keyHints(frame).includes("y copied"));
  app.mockInput.pressKey("y", { shift: true });
  await app.waitForFrame(() => copied.length === 2);

  expect(copied).toEqual(["1a".repeat(8), cartTraceId]);
});
