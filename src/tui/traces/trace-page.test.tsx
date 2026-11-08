import { afterEach, expect, mock, setSystemTime, spyOn, test } from "bun:test";

import { type CapturedFrame, RGBA } from "@opentui/core";

import { renderApp } from "#testing/app.tsx";
import { logsRequest, SEVERITY_NUMBER, tracesRequest } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import { detailsLines, keyHints, pageHeader, tableRows, textLines } from "#testing/screen.ts";
import { serviceColor } from "#tui/theme/theme.ts";
import { collapseWhitespace } from "#utils/collapse-whitespace.ts";

import spanDetails from "./sql/span-details.sql" with { type: "text" };
import {
  at,
  CART_ROW,
  cartTraceId,
  CHARGE_DECLINED,
  CHARGE_FAILED,
  CHECKOUT_ROW,
  checkoutTraceId,
  GET_CART,
  missingParentId,
  openTrace,
  PLACE_ORDER,
  STATUS_ROW,
} from "./test-traces.ts";
import {} from "./traces-histogram.tsx";

afterEach(() => {
  setSystemTime();
  mock.restore();
});

function spanRows(frame: string) {
  const lines = frame.split("\n");
  const header = lines.findIndex((line) => line.includes("Service") && line.includes("Duration"));
  const panel = lines.findIndex((line) => line.startsWith("─"));
  if (header === -1 || panel === -1) {
    return [];
  }
  return lines.slice(header + 1, panel).filter((line) => line.trim() !== "");
}

function barExtent({ lines }: CapturedFrame, name: string, color: string) {
  const background = RGBA.fromHex(color);
  const row = lines.find(
    ({ spans }) =>
      spans.some((span) => span.text.includes(name)) &&
      spans.some((span) => span.bg.equals(background)),
  );
  let column = 0;
  let start = -1;
  let end = -1;
  for (const span of row?.spans ?? []) {
    if (span.bg.equals(background)) {
      start = start === -1 ? column : start;
      end = column + span.width;
    }
    column += span.width;
  }
  return { start, end };
}

test("opens a trace as a span waterfall", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);

  const frame = await app.waitForFrame((frame) => spanRows(frame).length === 3);

  expect(textLines(frame).slice(1, 4)).toEqual([
    `${PLACE_ORDER} ${checkoutTraceId}`,
    "● checkout 12:00:01.000 3 spans 2 errors 500.0ms",
    "Service Name Duration 0 500.0ms",
  ]);
  expect(spanRows(frame).map((row) => collapseWhitespace(row))).toEqual([
    `● checkout ${PLACE_ORDER} 450.0ms`,
    "● payment charge 300.0ms",
    "● fraud-detection orders process 40.0ms",
  ]);
});

test("indents each span under its parent", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);

  const [root, child, grandchild] = spanRows(
    await app.waitForFrame((frame) => frame.includes("valkey-cart:6379")),
  );
  const nameColumn = root?.indexOf("GET /api/cart") ?? -1;

  expect(child?.indexOf("POST /oteldemo")).toBe(nameColumn + 2);
  expect(grandchild?.indexOf("valkey-cart:6379")).toBe(nameColumn + 4);
});

test("draws each span's bar inside its parent's bar", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);
  await app.waitForFrame((frame) => frame.includes("valkey-cart:6379"));

  const frame = await app.captureSpans();
  const root = barExtent(frame, "GET /api/cart", serviceColor("frontend"));
  const child = barExtent(frame, "POST /oteldemo", serviceColor("cart"));
  const grandchild = barExtent(frame, "valkey-cart:6379", serviceColor("cart"));

  expect(root.start).toBeLessThan(child.start);
  expect(child.start).toBeLessThan(grandchild.start);
  expect(grandchild.end).toBeLessThan(child.end);
  expect(child.end).toBeLessThan(root.end);
});

test("shows the selected span's attributes, resource, and scope", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);

  const frame = await app.waitForFrame((frame) => frame.includes("Scope"));

  expect(detailsLines(frame)).toEqual([
    `GET /api/cart ${"1a".repeat(8)}`,
    "● frontend server 12:00:00.000 +0µs 120.0ms",
    "Attributes",
    "http.route /api/cart",
    "Resource",
    "host.name colima",
    "service.name frontend",
    "Scope",
    "next.js 0.0.1",
  ]);
});

test("shows the selected span's events with their offsets", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CART_ROW);
  await app.waitForFrame((frame) => frame.includes("Scope"));

  app.mockInput.pressArrow("down");
  const frame = await app.waitForFrame((frame) => frame.includes("feature_flag.evaluation"));

  expect(detailsLines(frame)).toEqual([
    `${GET_CART} ${"1b".repeat(8)}`,
    "● cart server 12:00:00.010 +10.0ms 80.0ms",
    "Events",
    "-2.0ms Enqueued",
    "+5.0ms feature_flag.evaluation",
    "feature_flag.key cartFailure",
    "Fetch cart",
    "Resource",
    "service.name cart",
  ]);
});

test("shows a span's links and status message", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);

  const frame = await app.waitForFrame((frame) => frame.includes("Links"));

  expect(detailsLines(frame)).toEqual([
    `${PLACE_ORDER} ${"2a".repeat(8)}`,
    "● checkout server 12:00:01.000 +0µs 450.0ms",
    CHARGE_FAILED,
    "Links",
    `${cartTraceId} ${"1a".repeat(8)}`,
    "demo.cart.items.count 4",
    "Resource",
    "service.name checkout",
  ]);
});

test("points out a span whose parent never arrived", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);
  await app.waitForFrame((frame) => detailsLines(frame).includes(CHARGE_FAILED));

  app.mockInput.pressKey("END");
  const frame = await app.waitForFrame((frame) => frame.includes("not received"));

  expect(textLines(frame)).toContain(
    `● fraud-detection consumer 12:00:01.460 +460.0ms 40.0ms parent ${missingParentId} not received`,
  );
});

test("opens a trace whose spans have no kind", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, STATUS_ROW);

  const frame = await app.waitForFrame((frame) => frame.includes("unspecified"));

  expect(textLines(frame)).toContain("● image-provider unspecified 12:00:02.000 +0µs 1.0ms");
});

test("loads a span's details again after they failed to load", async () => {
  spyOn(console, "error").mockImplementation(() => {});
  await using receiver = await startTestReceiver();
  const connection = await receiver.connect();
  const runAndReadAll = connection.runAndReadAll.bind(connection);
  let failures = 1;
  spyOn(connection, "runAndReadAll").mockImplementation((...args) => {
    if (args[0] === spanDetails && failures > 0) {
      failures--;
      return Promise.reject(new Error("span details are unavailable"));
    }
    return runAndReadAll(...args);
  });
  await using app = await openTrace(receiver, CART_ROW, { connection });
  await app.waitForFrame((frame) => detailsLines(frame).includes("Failed to load span details"));

  app.mockInput.pressArrow("down");
  await app.waitForFrame((frame) => !detailsLines(frame).includes("Failed to load span details"));
  app.mockInput.pressArrow("up");

  await app.waitForFrame((frame) => detailsLines(frame).includes("http.route /api/cart"));
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

test("goes back to the list with the opened trace still selected", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => tableRows(frame).length === 3);

  expect(await app.waitForSelection(PLACE_ORDER)).toBe(CHECKOUT_ROW);
});

test("opens the logs of the open trace in the logs view", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/logs",
    logsRequest(
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
    ),
  );
  await using app = await openTrace(receiver, CHECKOUT_ROW);

  app.mockInput.pressKey("l");

  const frame = await app.waitForFrame((frame) => frame.includes("[PlaceOrder]"));
  expect(pageHeader(frame)).toBe("trace 22222222 2 of 3 logs");
  expect(frame).toContain("Credit card info is invalid.");
  expect(frame).not.toContain("starting to listen on tcp");
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

test("scrolls the span panel down and back up", async () => {
  await using receiver = await startTestReceiver();
  const attributes = Object.fromEntries(
    Array.from({ length: 30 }, (_, index) => [`demo.product.id.${index + 1}`, "0PUK6V6EV0"]),
  );
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "frontend",
      spans: [
        {
          traceId: cartTraceId,
          spanId: "1a".repeat(8),
          name: "GET /api/cart",
          start: at(0),
          end: at(10),
          attributes,
        },
      ],
    }),
  );
  await using app = await renderApp(receiver);
  await app.waitForFrame((frame) => tableRows(frame).length === 1);
  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("/ search"));
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => detailsLines(frame).includes("demo.product.id.1 0PUK6V6EV0"));

  app.mockInput.pressKey("d", { ctrl: true });
  await app.waitForFrame((frame) => !detailsLines(frame).includes("demo.product.id.1 0PUK6V6EV0"));

  app.mockInput.pressKey("u", { ctrl: true });
  await app.waitForFrame((frame) => detailsLines(frame).includes("demo.product.id.1 0PUK6V6EV0"));
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
