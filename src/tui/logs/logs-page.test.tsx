import { expect, setSystemTime, test } from "bun:test";

import { renderPage, search, selectRow } from "#testing/app.tsx";
import { at } from "#testing/clock.ts";
import {
  CART_EVENT_ROW,
  checkoutTrace,
  ERROR_ROW,
  FATAL_ROW,
  JSON_ROW,
  NEWEST_FIRST,
  NOTICE_ROW,
  ORDER_ROW,
  otlpLogs,
  renderLogList,
  WARN_ROW,
} from "#testing/logs.ts";
import { logsRequest, SEVERITY_NUMBER, tracesRequest } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import {
  color,
  detailsLines,
  keyHints,
  lineSpans,
  onDetails,
  onList,
  pageHeader,
  spanColors,
  tableRows,
  textLines,
} from "#testing/screen.ts";
import { checkoutTraceId, PLACE_ORDER, placeOrderSpanId } from "#testing/traces.ts";
import { GESTURE_PAUSE_MS } from "#tui/components/use-scroll-gesture.ts";
import { THEME } from "#tui/theme/theme.ts";

test("waits for logs before any arrive", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderPage(receiver, "logs");

  const frame = await app.waitForFrame((frame) => frame.includes("Waiting for logs..."));

  expect(frame).toContain("0 logs");
});

test("lists logs newest first, falling back to the observed time", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  const frame = await app.waitForFrame((frame) => frame.includes("7 logs"));

  expect(textLines(frame)).toContain("Time Severity Service Body");
  expect(tableRows(frame)).toEqual(NEWEST_FIRST);
});

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

test("raises and lowers the minimum severity", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  async function pressSeverityKey(shift: boolean, label: string, rows: string[]) {
    app.mockInput.pressKey("s", { shift });
    const frame = await app.waitForRows(rows);
    expect(pageHeader(frame)).toBe(`${label} ${rows.length} of 7 logs`);
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
  expect(pageHeader(frame)).toBe("≥ FATAL 1 of 7 logs");

  app.mockInput.pressKey("s");
  frame = await app.waitForFrame((frame) => tableRows(frame).length === 7);
  expect(pageHeader(frame)).toBe("7 logs");
});

test("searches bodies, attributes, services, and trace IDs", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  async function expectSearch(text: string, rows: string[]) {
    await search(app, text);
    const frame = await app.waitForRows(rows);
    expect(frame).toContain(`${rows.length} of 7 logs`);
    app.mockInput.pressEscape();
    await app.waitForFrame((frame) => tableRows(frame).length === 7);
  }

  await expectSearch("OutOfMemoryError", [FATAL_ROW]);
  await expectSearch("user_currency", [ORDER_ROW]);
  await expectSearch("payment", [ERROR_ROW, WARN_ROW]);
  await expectSearch(checkoutTraceId.slice(0, 8), [ERROR_ROW, WARN_ROW, ORDER_ROW]);
});

test("filters logs by an attribute", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  await search(app, "demo.user_context.loyalty_level=gold");

  const frame = await app.waitForRows([WARN_ROW]);
  expect(frame).toContain("1 of 7 logs");
});

test("keeps an applied search while browsing", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  await search(app, "payment");
  await app.waitForFrame((frame) => tableRows(frame).length === 2);
  app.mockInput.pressEnter();
  await app.waitForFrame(onList);

  app.mockInput.pressArrow("down");

  expect(await app.waitForSelection("Payment request failed")).toBe(WARN_ROW);
  await app.waitForFrame((frame) => pageHeader(frame) === "/payment 2 of 7 logs");
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
  let frame = await app.waitForFrame((frame) => tableRows(frame).length === 3);
  expect(pageHeader(frame)).toBe("trace 22222222 3 of 7 logs");
  expect(tableRows(frame)).toEqual([ERROR_ROW, WARN_ROW, ORDER_ROW]);

  app.mockInput.pressKey("t");
  frame = await app.waitForFrame((frame) => tableRows(frame).length === 7);
  expect(pageHeader(frame)).toBe("7 logs");

  app.mockInput.pressKey("t");
  await app.waitForFrame((frame) => tableRows(frame).length === 3);
  app.mockInput.pressEscape();
  frame = await app.waitForFrame((frame) => tableRows(frame).length === 7);
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
  expect(keyHints(frame)).toStartWith(
    "e next error return open trace t trace y copy body / search",
  );
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
  frame = await app.waitForFrame((frame) => tableRows(frame).length === NEWEST_FIRST.length);
  expect(pageHeader(frame)).toBe("7 logs");
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
  await using app = await renderPage(receiver, "traces");

  await app.waitForFrame((frame) => frame.includes(PLACE_ORDER));
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("2 spans"));
  expect(await app.waitForSelection(PLACE_ORDER)).toBe(`● checkout ${PLACE_ORDER} 2.50s`);

  app.mockInput.pressTab({ shift: true });
  await app.waitForFrame((frame) => !onDetails(frame));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => frame.includes("Waiting for metrics..."));
  app.mockInput.pressArrow("right");
  await app.waitForFrame((frame) => tableRows(frame).length === NEWEST_FIRST.length);
  app.mockInput.pressTab();
  await app.waitForFrame(onList);
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
  await using app = await renderPage(receiver, "logs");

  const frame = await app.waitForFrame((frame) => tableRows(frame).length === 3);
  expect(tableRows(frame)).toEqual([
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
  const scrollStart = at(10_000);
  setSystemTime(scrollStart);
  try {
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
    expect(detailsLines(await app.waitForFrame((frame) => frame.includes("Body")))).toContain(
      "Body",
    );

    setSystemTime(new Date(scrollStart.getTime() + GESTURE_PAUSE_MS + 1));
    await app.mockMouse.scroll(panelColumn, panelLine, "down");
    await app.waitForFrame((frame) => !detailsLines(frame).includes("Body"));
  } finally {
    setSystemTime();
  }
});

test("shows an error when logs cannot be loaded", async () => {
  await using receiver = await startTestReceiver();
  const connection = await receiver.connect();
  await connection.run("DROP TABLE otlp_logs");

  await using app = await renderPage(receiver, "logs");

  await app.waitForFrame((frame) => frame.includes("Failed to load logs"));
});

test("copies the selected log's body", async () => {
  await using receiver = await startTestReceiver();
  const copied: string[] = [];
  await using app = await renderLogList(receiver, { copied });

  app.mockInput.pressKey("y");

  await app.waitForFrame((frame) => keyHints(frame).includes("y copied"));
  expect(copied).toEqual(["Database connection established"]);
});

test("colors each severity", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  const frame = await app.captureSpans();

  expect(spanColors(lineSpans(frame, "Credit card info"), "ERROR").fg).toEqual(
    color(THEME.textError),
  );
  expect(spanColors(lineSpans(frame, "Payment request failed"), "WARN").fg).toEqual(
    color(THEME.textWarning),
  );
  expect(spanColors(lineSpans(frame, "[PlaceOrder]"), "INFO").fg).toEqual(color(THEME.text));
});

test("charts the logs over time and narrows the list to a column", async () => {
  setSystemTime(at(50_000));
  try {
    await using receiver = await startTestReceiver();
    await using app = await renderLogList(receiver);
    let frame = await app.waitForFrame((frame) => frame.includes("Logs over time"));
    expect(textLines(frame)).toContain("Logs over time ■ errors 10s per column");

    app.mockInput.pressArrow("right");
    frame = await app.waitForFrame((frame) => pageHeader(frame).startsWith("12:00:00–12:00:10"));
    expect(pageHeader(frame)).toBe("12:00:00–12:00:10 7 logs");

    app.mockInput.pressEscape();
    await app.waitForFrame((frame) => pageHeader(frame) === "7 logs");
  } finally {
    setSystemTime();
  }
});
