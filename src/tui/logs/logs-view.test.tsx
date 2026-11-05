import { expect, test } from "bun:test";

import { renderApp } from "#testing/app.tsx";
import { logsRequest, SEVERITY_NUMBER, tracesRequest } from "#testing/otlp.ts";
import { startTestReceiver, type TestReceiver } from "#testing/receiver.ts";
import { panelLines, textLines } from "#testing/render.tsx";

const baseTime = Date.parse("2026-10-28T12:00:00.000Z");

const checkoutTraceId = "2".repeat(32);
const placeOrderSpanId = "2a".repeat(8);
const chargeSpanId = "2b".repeat(8);

const PLACE_ORDER = "oteldemo.CheckoutService/PlaceOrder";

function at(ms: number) {
  return new Date(baseTime + ms);
}

const otlpLogs = logsRequest(
  {
    service: "checkout",
    attributes: { "host.name": "colima" },
    scope: { name: "checkout" },
    logs: [
      {
        time: at(0),
        severityNumber: SEVERITY_NUMBER.info,
        body: "[PlaceOrder]",
        traceId: checkoutTraceId,
        spanId: placeOrderSpanId,
        attributes: { user_currency: "USD" },
      },
    ],
  },
  {
    service: "payment",
    logs: [
      {
        time: at(1000),
        severityNumber: SEVERITY_NUMBER.warn,
        severityText: "warn",
        body: "Payment request failed. Invalid token.",
        traceId: checkoutTraceId,
        spanId: chargeSpanId,
        attributes: { "demo.user_context.loyalty_level": "gold" },
      },
      {
        time: at(2000),
        severityNumber: SEVERITY_NUMBER.error,
        body: "Credit card info is invalid.",
        traceId: checkoutTraceId,
        spanId: chargeSpanId,
      },
    ],
  },
  {
    service: "frontend",
    logs: [
      {
        time: at(3000),
        severityNumber: SEVERITY_NUMBER.debug,
        body: '{"url.path":"/api/cart","http.response.status_code":200}',
      },
    ],
  },
  {
    service: "cart",
    logs: [
      {
        time: at(5000),
        severityNumber: SEVERITY_NUMBER.info,
        eventName: "cart.get",
        body: "GetCartAsync called\n  with userId={userId}",
      },
    ],
  },
  {
    service: "product-catalog",
    logs: [
      { observedTime: at(6000), severityText: "notice", body: "Database connection established" },
    ],
  },
  {
    service: "ad",
    logs: [
      {
        time: at(4000),
        severityNumber: SEVERITY_NUMBER.fatal,
        body: "java.lang.OutOfMemoryError: Java heap space",
      },
    ],
  },
);

const checkoutTrace = tracesRequest(
  {
    service: "checkout",
    spans: [
      {
        traceId: checkoutTraceId,
        spanId: placeOrderSpanId,
        name: PLACE_ORDER,
        start: at(0),
        end: at(2500),
      },
    ],
  },
  {
    service: "payment",
    spans: [
      {
        traceId: checkoutTraceId,
        spanId: chargeSpanId,
        parentSpanId: placeOrderSpanId,
        name: "charge",
        start: at(500),
        end: at(2000),
      },
    ],
  },
);

const NOTICE_ROW = "12:00:06.000 notice ● product-catalog Database connection established";
const CART_EVENT_ROW = "12:00:05.000 INFO ● cart cart.get GetCartAsync called with userId={userId}";
const FATAL_ROW = "12:00:04.000 FATAL ● ad java.lang.OutOfMemoryError: Java heap space";
const JSON_ROW =
  '12:00:03.000 DEBUG ● frontend {"url.path":"/api/cart","http.response.status_code":200}';
const ERROR_ROW = "12:00:02.000 ERROR ● payment Credit card info is invalid.";
const WARN_ROW = "12:00:01.000 WARN ● payment Payment request failed. Invalid token.";
const ORDER_ROW = "12:00:00.000 INFO ● checkout [PlaceOrder]";

const NEWEST_FIRST = [
  NOTICE_ROW,
  CART_EVENT_ROW,
  FATAL_ROW,
  JSON_ROW,
  ERROR_ROW,
  WARN_ROW,
  ORDER_ROW,
];

const LOG_COUNT = / logs? *$/m;

function logRows(frame: string) {
  return textLines(frame).filter((line) => /^\d{2}:\d{2}:\d{2}\.\d{3} /.test(line));
}

async function renderLogs(receiver: TestReceiver) {
  const app = await renderApp(receiver);
  await app.waitForFrame((frame) => frame.includes("tab next region"));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => LOG_COUNT.test(frame));
  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("/ search"));
  return app;
}

async function renderLogList(receiver: TestReceiver) {
  await receiver.sendHttp("/v1/logs", otlpLogs);
  const app = await renderLogs(receiver);
  await app.waitForFrame((frame) => logRows(frame).length === NEWEST_FIRST.length);
  return app;
}

test("waits for logs before any arrive", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogs(receiver);

  const frame = await app.waitForFrame((frame) => frame.includes("Waiting for logs..."));

  expect(frame).toContain("0 logs");
});

test("lists logs newest first, falling back to the observed time", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  const frame = await app.waitForFrame((frame) => frame.includes("7 logs"));

  expect(textLines(frame)).toContain("Time Severity Service Body");
  expect(logRows(frame)).toEqual(NEWEST_FIRST);
});

test("shows the selected log's body, attributes, resource, and scope", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  app.mockInput.pressKey("END");
  const frame = await app.waitForFrame((frame) => panelLines(frame).includes("user_currency USD"));

  expect(panelLines(frame)).toEqual([
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

  const jsonRowIndex = NEWEST_FIRST.indexOf(JSON_ROW);
  for (const row of NEWEST_FIRST.slice(1, jsonRowIndex + 1)) {
    app.mockInput.pressArrow("down");
    await app.waitForSelection(row);
  }
  const frame = await app.waitForFrame((frame) =>
    frame.includes('"http.response.status_code": 200'),
  );

  expect(panelLines(frame)).toEqual([
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

test("raises and lowers the minimum severity", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  async function pressSeverityKey(shift: boolean, label: string, rows: string[]) {
    app.mockInput.pressKey("s", { shift });
    const frame = await app.waitForFrame((frame) => Bun.deepEquals(logRows(frame), rows));
    expect(textLines(frame)[1]).toBe(`${label} ${rows.length} of 7 logs`);
  }

  await pressSeverityKey(false, "≥ DEBUG", NEWEST_FIRST.slice(1));
  await pressSeverityKey(false, "≥ INFO", [
    CART_EVENT_ROW,
    FATAL_ROW,
    ERROR_ROW,
    WARN_ROW,
    ORDER_ROW,
  ]);
  await pressSeverityKey(false, "≥ WARN", [FATAL_ROW, ERROR_ROW, WARN_ROW]);
  await pressSeverityKey(true, "≥ INFO", [
    CART_EVENT_ROW,
    FATAL_ROW,
    ERROR_ROW,
    WARN_ROW,
    ORDER_ROW,
  ]);
});

test("wraps the severity filter around to show every log again", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  app.mockInput.pressKey("s", { shift: true });
  let frame = await app.waitForFrame((frame) => frame.includes("1 of 7 logs"));
  expect(textLines(frame)[1]).toBe("≥ FATAL 1 of 7 logs");

  app.mockInput.pressKey("s");
  frame = await app.waitForFrame((frame) => logRows(frame).length === 7);
  expect(textLines(frame)[1]).toBe("7 logs");
});

test("searches bodies, attributes, services, and trace IDs", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  async function search(text: string, rows: string[]) {
    app.mockInput.pressKey("/");
    await app.waitForFrame((frame) => frame.includes("body, attributes, service or trace ID"));
    await app.mockInput.typeText(text);
    const frame = await app.waitForFrame((frame) => Bun.deepEquals(logRows(frame), rows));
    expect(frame).toContain(`${rows.length} of 7 logs`);
    app.mockInput.pressEscape();
    await app.waitForFrame((frame) => logRows(frame).length === 7);
  }

  await search("OutOfMemoryError", [FATAL_ROW]);
  await search("user_currency", [ORDER_ROW]);
  await search("payment", [ERROR_ROW, WARN_ROW]);
  await search(checkoutTraceId.slice(0, 8), [ERROR_ROW, WARN_ROW, ORDER_ROW]);
});

test("keeps an applied search while browsing", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => frame.includes("body, attributes, service or trace ID"));
  await app.mockInput.typeText("payment");
  await app.waitForFrame((frame) => logRows(frame).length === 2);
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("/ search"));

  app.mockInput.pressArrow("down");

  expect(await app.waitForSelection("Payment request failed")).toBe(WARN_ROW);
  await app.waitForFrame((frame) => textLines(frame)[1] === "/payment 2 of 7 logs");
});

test("jumps between errors in both directions", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);
  await app.waitForSelection(NOTICE_ROW);

  app.mockInput.pressKey("e");
  expect(await app.waitForSelection("OutOfMemoryError")).toBe(FATAL_ROW);

  app.mockInput.pressKey("e");
  expect(await app.waitForSelection("Credit card info is invalid.")).toBe(ERROR_ROW);

  app.mockInput.pressKey("e");
  expect(await app.waitForSelection("OutOfMemoryError")).toBe(FATAL_ROW);

  app.mockInput.pressKey("e", { shift: true });
  expect(await app.waitForSelection("Credit card info is invalid.")).toBe(ERROR_ROW);
});

test("narrows the list to the selected log's trace and back", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);
  app.mockInput.pressKey("e");
  await app.waitForSelection(FATAL_ROW);
  app.mockInput.pressKey("e");
  await app.waitForSelection(ERROR_ROW);

  app.mockInput.pressKey("t");
  let frame = await app.waitForFrame((frame) => logRows(frame).length === 3);
  expect(textLines(frame)[1]).toBe("trace 22222222 3 of 7 logs");
  expect(logRows(frame)).toEqual([ERROR_ROW, WARN_ROW, ORDER_ROW]);

  app.mockInput.pressKey("t");
  frame = await app.waitForFrame((frame) => logRows(frame).length === 7);
  expect(textLines(frame)[1]).toBe("7 logs");

  app.mockInput.pressKey("t");
  await app.waitForFrame((frame) => logRows(frame).length === 3);
  app.mockInput.pressEscape();
  frame = await app.waitForFrame((frame) => logRows(frame).length === 7);
  expect(frame).not.toContain("trace 22222222");
});

test("offers trace actions only for logs with a trace", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  let frame = await app.waitForFrame((frame) => frame.includes("e next error"));
  expect(frame).not.toContain("t trace");

  app.mockInput.pressKey("e");
  await app.waitForSelection(FATAL_ROW);
  app.mockInput.pressKey("e");
  frame = await app.waitForFrame((frame) => frame.includes("t trace"));
  expect(textLines(frame).at(-1)).toStartWith("e next error return open trace t trace / search");
});

test("opens the selected log's trace in the traces view and goes back to the log", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "checkout",
      spans: [
        {
          traceId: checkoutTraceId,
          spanId: placeOrderSpanId,
          name: PLACE_ORDER,
          start: at(0),
          end: at(2500),
        },
      ],
    }),
  );
  await using app = await renderLogList(receiver);
  app.mockInput.pressKey("END");
  await app.waitForSelection(ORDER_ROW);

  app.mockInput.pressEnter();
  let frame = await app.waitForFrame((frame) => frame.includes("1 span"));
  expect(textLines(frame).slice(1, 3)).toEqual([
    `${PLACE_ORDER} ${checkoutTraceId}`,
    "● checkout 12:00:00.000 1 span 2.50s",
  ]);

  app.mockInput.pressEscape();
  frame = await app.waitForFrame((frame) => logRows(frame).length === NEWEST_FIRST.length);
  expect(textLines(frame)[1]).toBe("7 logs");
  expect(await app.waitForSelection("[PlaceOrder]")).toBe(ORDER_ROW);
});

test("selects the log's span in the trace it opens", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", checkoutTrace);
  await using app = await renderLogList(receiver);
  app.mockInput.pressKey("e");
  await app.waitForSelection(FATAL_ROW);
  app.mockInput.pressKey("e");
  await app.waitForSelection(ERROR_ROW);

  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("2 spans"));

  expect(await app.waitForSelection("charge")).toBe("● payment charge 1.50s");
});

test("selects the log's span in a trace that is already open", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", checkoutTrace);
  await receiver.sendHttp("/v1/logs", otlpLogs);
  await using app = await renderApp(receiver);

  await app.waitForFrame((frame) => frame.includes(PLACE_ORDER));
  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("/ search"));
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("2 spans"));
  expect(await app.waitForSelection(PLACE_ORDER)).toBe(`● checkout ${PLACE_ORDER} 2.50s`);

  app.mockInput.pressTab({ shift: true });
  await app.waitForFrame((frame) => !frame.includes("escape back"));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => logRows(frame).length === NEWEST_FIRST.length);
  app.mockInput.pressTab();
  await app.waitForFrame((frame) => frame.includes("/ search"));
  app.mockInput.pressKey("e");
  await app.waitForSelection(FATAL_ROW);
  app.mockInput.pressKey("e");
  await app.waitForSelection(ERROR_ROW);

  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("2 spans"));

  expect(await app.waitForSelection("charge")).toBe("● payment charge 1.50s");
});

test("lists identical logs separately and selects each in turn", async () => {
  await using receiver = await startTestReceiver();
  const repeated = {
    time: at(1000),
    severityNumber: SEVERITY_NUMBER.info,
    body: "get_product_list: cache hit",
  };
  const earlier = {
    time: at(0),
    severityNumber: SEVERITY_NUMBER.info,
    body: "get_product_list: cache miss",
  };
  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({ service: "recommendation", logs: [repeated, repeated, earlier] }),
  );
  await using app = await renderLogs(receiver);

  const frame = await app.waitForFrame((frame) => logRows(frame).length === 3);
  expect(logRows(frame)).toEqual([
    "12:00:01.000 INFO ● recommendation get_product_list: cache hit",
    "12:00:01.000 INFO ● recommendation get_product_list: cache hit",
    "12:00:00.000 INFO ● recommendation get_product_list: cache miss",
  ]);

  const firstRowLine = frame.split("\n").findIndex((line) => line.includes("cache hit"));
  await app.waitForSelection("cache hit", { line: firstRowLine });
  app.mockInput.pressArrow("down");
  await app.waitForSelection("cache hit", { line: firstRowLine + 1 });
  app.mockInput.pressArrow("down");
  await app.waitForSelection("cache miss");
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
  await using app = await renderLogs(receiver);
  await app.waitForFrame((frame) =>
    panelLines(frame).includes("java.lang.OutOfMemoryError: Java heap space"),
  );

  app.mockInput.pressKey("d", { ctrl: true });
  await app.waitForFrame(
    (frame) => !panelLines(frame).includes("java.lang.OutOfMemoryError: Java heap space"),
  );

  app.mockInput.pressKey("u", { ctrl: true });
  await app.waitForFrame((frame) =>
    panelLines(frame).includes("java.lang.OutOfMemoryError: Java heap space"),
  );
});

test("shows an error when logs cannot be loaded", async () => {
  await using receiver = await startTestReceiver();
  const connection = await receiver.connect();
  await connection.run("DROP TABLE otlp_logs");

  await using app = await renderLogs(receiver);

  await app.waitForFrame((frame) => frame.includes("Failed to load logs"));
});
