import { expect, spyOn, test } from "bun:test";

import spanDetails from "#telemetry/traces/sql/span-details.sql" with { type: "text" };
import { renderPage } from "#testing/app.tsx";
import { at } from "#testing/clock.ts";
import { silenceConsoleError } from "#testing/console.ts";
import { tracesRequest } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import { detailsLines, keyHints, spanRows, tableRows } from "#testing/screen.ts";
import {
  CART_ROW,
  cartTraceId,
  CHARGE_FAILED,
  CHECKOUT_ROW,
  GET_CART,
  openTrace,
  PLACE_ORDER,
} from "#testing/traces.ts";

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

test("opens a linked trace from the links region and comes back", async () => {
  await using receiver = await startTestReceiver();
  await using app = await openTrace(receiver, CHECKOUT_ROW);
  await app.waitForFrame((frame) => detailsLines(frame).includes("Links"));

  app.mockInput.pressTab();
  await app.waitForFrame((frame) => keyHints(frame).includes("return open link"));
  app.mockInput.pressEnter();

  expect(await app.waitForSelection("GET /api/cart")).toContain("● frontend GET /api/cart");
  app.mockInput.pressEscape();
  await app.waitForSelection(PLACE_ORDER);
});

test("selects a span linked within the same trace", async () => {
  await using receiver = await startTestReceiver();
  const traceId = "c".repeat(32);
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "worker",
      spans: [
        { traceId, spanId: "ca".repeat(8), name: "run batch", start: at(0), end: at(100) },
        {
          traceId,
          spanId: "cb".repeat(8),
          parentSpanId: "ca".repeat(8),
          name: "load",
          start: at(10),
          end: at(40),
        },
        {
          traceId,
          spanId: "cc".repeat(8),
          parentSpanId: "ca".repeat(8),
          name: "merge",
          start: at(50),
          end: at(90),
          links: [
            { traceId, spanId: "cb".repeat(8) },
            { traceId: "d".repeat(32), spanId: "da".repeat(8) },
          ],
        },
      ],
    }),
  );
  await using app = await renderPage(receiver, "traces");
  await app.waitForFrame((frame) => keyHints(frame).includes("return open"));
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => spanRows(frame).length === 3);
  app.mockInput.pressArrow("down");
  app.mockInput.pressArrow("down");
  await app.waitForSelection("merge");
  await app.waitForFrame((frame) =>
    detailsLines(frame).includes(`${traceId} ${"cb".repeat(8)} (this trace)`),
  );

  app.mockInput.pressTab();
  let frame = await app.waitForFrame((frame) => keyHints(frame).includes("return open link"));
  expect(detailsLines(frame)).toContain(`${traceId} ${"cb".repeat(8)} (this trace)`);
  expect(detailsLines(frame)).toContain(`${"d".repeat(32)} ${"da".repeat(8)} (not stored)`);
  app.mockInput.pressArrow("down");
  frame = await app.waitForFrame((frame) => !keyHints(frame).includes("open link"));
  app.mockInput.pressArrow("up");
  await app.waitForFrame((frame) => keyHints(frame).includes("return open link"));
  app.mockInput.pressEnter();

  await app.waitForSelection("load");
});

test("loads a span's details again after they failed to load", async () => {
  silenceConsoleError();
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
  await using app = await renderPage(receiver, "traces");
  await app.waitForFrame((frame) => tableRows(frame).length === 1);
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => detailsLines(frame).includes("demo.product.id.1 0PUK6V6EV0"));

  app.mockInput.pressKey("d", { ctrl: true });
  await app.waitForFrame((frame) => !detailsLines(frame).includes("demo.product.id.1 0PUK6V6EV0"));

  app.mockInput.pressKey("u", { ctrl: true });
  await app.waitForFrame((frame) => detailsLines(frame).includes("demo.product.id.1 0PUK6V6EV0"));
});
