import { afterEach, expect, mock, test } from "bun:test";

import { renderPage, search, type TestApp } from "#testing/app.tsx";
import { at } from "#testing/clock.ts";
import { tracesRequest } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import {
  color,
  keyHints,
  lineSpans,
  onList,
  pageHeader,
  selectedBackground,
  spanColors,
  tableRows,
  textLines,
} from "#testing/screen.ts";
import {
  CART_ROW,
  CHECKOUT_ROW,
  NEWEST_FIRST,
  otlpTraces,
  PLACE_ORDER,
  renderTraceList,
  STATUS_ROW,
  statusTraceId,
} from "#testing/traces.ts";
import { serviceColor, THEME } from "#tui/theme/theme.ts";

afterEach(() => {
  mock.restore();
});

test("waits for traces before any arrive", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderPage(receiver, "traces");

  const frame = await app.waitForFrame((frame) => frame.includes("Waiting for traces..."));

  expect(frame).toContain("0 traces");
});

test("lists traces whose root span arrived, newest first, with span and error counts", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await using app = await renderPage(receiver, "traces");

  const frame = await app.waitForFrame((frame) => tableRows(frame).length === 3);

  expect(textLines(frame)).toContain("3 traces");
  expect(textLines(frame)).toContain("Time ▼ Service Name Spans Errors Duration");
  expect(tableRows(frame)).toEqual(NEWEST_FIRST);
});

test("searches trace names, services, and IDs", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);

  await search(app, "cart");
  let frame = await app.waitForFrame((frame) => frame.includes("1 of 3 traces"));
  expect(tableRows(frame)).toEqual([CART_ROW]);

  app.mockInput.pressEnter();
  frame = await app.waitForFrame(onList);
  expect(pageHeader(frame)).toBe("/cart 1 of 3 traces");

  app.mockInput.pressEscape();
  frame = await app.waitForFrame((frame) => tableRows(frame).length === 3);
  expect(pageHeader(frame)).toBe("3 traces");

  await search(app, statusTraceId.slice(0, 8));
  frame = await app.waitForFrame((frame) => frame.includes("1 of 3 traces"));
  expect(tableRows(frame)).toEqual([STATUS_ROW]);
});

test("filters traces by a span or resource attribute", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);

  await search(app, "db.system=redis");
  let frame = await app.waitForFrame((frame) => frame.includes("1 of 3 traces"));
  expect(tableRows(frame)).toEqual([CART_ROW]);

  await app.mockInput.typeText(" host.name=elsewhere");
  frame = await app.waitForFrame((frame) => frame.includes("No traces match"));
  expect(frame).toContain("0 of 3 traces");
});

test("matches search text literally", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);

  await search(app, "_");

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
    const frame = await app.waitForRows(rows);
    expect(textLines(frame)).toContain(header);
  }

  await nextSort("Time Service Name ▼ Spans Errors Duration", [CHECKOUT_ROW, CART_ROW, STATUS_ROW]);
  await nextSort("Time Service Name Spans ▼ Errors Duration", [CHECKOUT_ROW, STATUS_ROW, CART_ROW]);
  await nextSort("Time Service Name Spans Errors ▼ Duration", [CHECKOUT_ROW, CART_ROW, STATUS_ROW]);
  await nextSort("Time ▼ Service Name Spans Errors Duration", NEWEST_FIRST);

  app.mockInput.pressKey("o", { shift: true });
  const frame = await app.waitForRows([CART_ROW, CHECKOUT_ROW, STATUS_ROW]);
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
  await search(app, "cart");
  app.mockInput.pressEnter();
  await app.waitForFrame(onList);

  app.mockInput.pressTab({ shift: true });
  await app.waitForFrame((frame) => frame.includes("tab next region") && !onList(frame));
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

  await using app = await renderPage(receiver, "traces");

  await app.waitForFrame((frame) => frame.includes("Failed to load traces"));
});

test("copies the selected trace's ID", async () => {
  await using receiver = await startTestReceiver();
  const copied: string[] = [];
  await using app = await renderTraceList(receiver, { copied });

  app.mockInput.pressKey("y");

  await app.waitForFrame((frame) => keyHints(frame).includes("y copied"));
  expect(copied).toEqual([statusTraceId]);
});

test("pauses and resumes live updates", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);

  app.mockInput.pressKey("p");
  const frame = await app.waitForFrame((frame) => keyHints(frame).includes("p resume"));
  expect(textLines(frame)[0]).toContain("paused · ");

  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "frontend",
      spans: [
        {
          traceId: "a".repeat(32),
          spanId: "a".repeat(16),
          name: "GET /",
          start: at(3000),
          end: at(3001),
        },
      ],
    }),
  );
  app.mockInput.pressKey("p");

  await app.waitForFrame((frame) => pageHeader(frame) === "4 traces");
  expect(keyHints(await app.waitForFrame((frame) => frame.includes("p pause")))).toContain(
    "p pause",
  );
});

test("colors each service and the error count", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);

  const spans = lineSpans(await app.captureSpans(), PLACE_ORDER);

  expect(spanColors(spans, "●").fg).toEqual(color(serviceColor("checkout")));
  expect(spanColors(spans, "2").fg).toEqual(color(THEME.textError));
});

test("highlights the selected row only while its region has focus", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);
  await app.waitForSelection(STATUS_ROW);

  app.mockInput.pressTab({ shift: true });
  await app.waitForFrame((frame) => !keyHints(frame).includes("/ search"));

  const spans = lineSpans(await app.captureSpans(), "GET /status");
  expect(spanColors(spans, "GET /status").bg).not.toEqual(selectedBackground.toInts());
});

async function searchTraces(app: TestApp, text: string) {
  await search(app, text);
  app.mockInput.pressEnter();
  return app.waitForFrame((frame) => pageHeader(frame).startsWith(`/${text} `));
}

async function clearSearch(app: TestApp) {
  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => !pageHeader(frame).startsWith("/"));
}

test("filters traces by span duration", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);

  let frame = await searchTraces(app, "duration>200ms");
  frame = await app.waitForFrame((frame) => pageHeader(frame).endsWith("1 of 3 traces"));
  expect(tableRows(frame)).toEqual([CHECKOUT_ROW]);

  await clearSearch(app);
  await searchTraces(app, "duration<10ms");
  frame = await app.waitForFrame((frame) => pageHeader(frame).endsWith("1 of 3 traces"));
  expect(tableRows(frame)).toEqual([STATUS_ROW]);
});

test("filters traces by spans whose attribute has a different value", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderTraceList(receiver);

  await searchTraces(app, "http.route!=/api/orders");
  let frame = await app.waitForFrame((frame) => pageHeader(frame).endsWith("1 of 3 traces"));
  expect(tableRows(frame)).toEqual([CART_ROW]);

  await clearSearch(app);
  await searchTraces(app, "http.route!=/api/cart");
  frame = await app.waitForFrame((frame) => frame.includes("No traces match"));
  expect(pageHeader(frame)).toEndWith("0 of 3 traces");
});

test("compares numeric attributes", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "frontend",
      spans: [200, 404, 503].map((status, index) => ({
        traceId: String(index + 5).repeat(32),
        spanId: String(index + 5).repeat(16),
        name: `GET /${status}`,
        start: at(index * 1000),
        end: at(index * 1000 + 10),
        attributes: { "http.response.status_code": status },
      })),
    }),
  );
  await using app = await renderPage(receiver, "traces");
  await app.waitForFrame((frame) => tableRows(frame).length === 3);

  await searchTraces(app, "http.response.status_code>=404");
  const frame = await app.waitForFrame((frame) => pageHeader(frame).endsWith("2 of 3 traces"));
  expect(tableRows(frame)).toEqual([
    expect.stringContaining("GET /503"),
    expect.stringContaining("GET /404"),
  ]);
});
