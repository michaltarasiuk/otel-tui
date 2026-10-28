import { expect, test } from "bun:test";

import { renderApp } from "../../testing/app.tsx";
import { logsRequest, SEVERITY_NUMBER, tracesRequest } from "../../testing/otlp.ts";
import { startTestReceiver, type TestReceiver } from "../../testing/receiver.ts";
import { panelLines, textLines } from "../../testing/render.tsx";

const BASE_TIME = Date.parse("2026-10-28T12:00:00.000Z");
const CHECKOUT_TRACE_ID = "2".repeat(32);
const ORDER_SPAN_ID = "2a".repeat(8);
const CHARGE_SPAN_ID = "2b".repeat(8);

function at(ms: number) {
  return new Date(BASE_TIME + ms);
}

const LOGS = logsRequest(
  {
    service: "checkout",
    attributes: { "host.name": "web-1" },
    scope: { name: "shop", version: "1.0.0" },
    logs: [
      {
        time: at(0),
        severityNumber: SEVERITY_NUMBER.info,
        body: "order placed",
        traceId: CHECKOUT_TRACE_ID,
        spanId: ORDER_SPAN_ID,
        attributes: { "order.id": "42" },
      },
    ],
  },
  {
    service: "payment",
    logs: [
      {
        time: at(1000),
        severityNumber: SEVERITY_NUMBER.warn,
        severityText: "warning",
        body: "retrying charge",
        traceId: CHECKOUT_TRACE_ID,
        spanId: CHARGE_SPAN_ID,
        attributes: { attempt: 2 },
      },
      {
        time: at(2000),
        severityNumber: SEVERITY_NUMBER.error,
        body: "charge failed",
        traceId: CHECKOUT_TRACE_ID,
        spanId: CHARGE_SPAN_ID,
      },
    ],
  },
  {
    service: "frontend",
    logs: [
      {
        time: at(3000),
        severityNumber: SEVERITY_NUMBER.debug,
        body: '{"path":"/cart","status":200}',
      },
      {
        time: at(5000),
        severityNumber: SEVERITY_NUMBER.info,
        eventName: "user.login",
        body: "signed in\n  via sso",
      },
      { observedTime: at(6000), severityText: "notice", body: "cache warmed" },
    ],
  },
  {
    service: "worker",
    logs: [{ time: at(4000), severityNumber: SEVERITY_NUMBER.fatal, body: "out of memory" }],
  },
);

const NOTICE_ROW = "12:00:06.000 notice ● frontend cache warmed";
const LOGIN_ROW = "12:00:05.000 INFO ● frontend user.login signed in via sso";
const FATAL_ROW = "12:00:04.000 FATAL ● worker out of memory";
const JSON_ROW = '12:00:03.000 DEBUG ● frontend {"path":"/cart","status":200}';
const ERROR_ROW = "12:00:02.000 ERROR ● payment charge failed";
const WARN_ROW = "12:00:01.000 WARN ● payment retrying charge";
const ORDER_ROW = "12:00:00.000 INFO ● checkout order placed";
const NEWEST_FIRST = [NOTICE_ROW, LOGIN_ROW, FATAL_ROW, JSON_ROW, ERROR_ROW, WARN_ROW, ORDER_ROW];

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
  await receiver.send("/v1/logs", LOGS);
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
  const frame = await app.waitForFrame((frame) => panelLines(frame).includes("shop 1.0.0"));

  expect(panelLines(frame)).toEqual([
    `INFO ● checkout 12:00:00.000 ${CHECKOUT_TRACE_ID} ${ORDER_SPAN_ID}`,
    "Body",
    "order placed",
    "Attributes",
    "order.id 42",
    "Resource",
    "host.name web-1",
    "service.name checkout",
    "Scope",
    "shop 1.0.0",
  ]);
});

test("pretty-prints a JSON body", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  for (const row of NEWEST_FIRST.slice(1, NEWEST_FIRST.indexOf(JSON_ROW) + 1)) {
    app.mockInput.pressArrow("down");
    await app.waitForSelection(row);
  }
  const frame = await app.waitForFrame((frame) => frame.includes('"status": 200'));

  expect(panelLines(frame)).toEqual([
    "DEBUG ● frontend 12:00:03.000",
    "Body",
    "{",
    '"path": "/cart",',
    '"status": 200',
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
  await pressSeverityKey(false, "≥ INFO", [LOGIN_ROW, FATAL_ROW, ERROR_ROW, WARN_ROW, ORDER_ROW]);
  await pressSeverityKey(false, "≥ WARN", [FATAL_ROW, ERROR_ROW, WARN_ROW]);
  await pressSeverityKey(true, "≥ INFO", [LOGIN_ROW, FATAL_ROW, ERROR_ROW, WARN_ROW, ORDER_ROW]);
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

  await search("memory", [FATAL_ROW]);
  await search("order.id", [ORDER_ROW]);
  await search("payment", [ERROR_ROW, WARN_ROW]);
  await search(CHECKOUT_TRACE_ID.slice(0, 8), [ERROR_ROW, WARN_ROW, ORDER_ROW]);
});

test("keeps an applied search while browsing", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);

  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => frame.includes("body, attributes, service or trace ID"));
  await app.mockInput.typeText("charge");
  await app.waitForFrame((frame) => logRows(frame).length === 2);
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("/ search"));

  app.mockInput.pressArrow("down");

  expect(await app.waitForSelection("retrying charge")).toBe(WARN_ROW);
  await app.waitForFrame((frame) => textLines(frame)[1] === "/charge 2 of 7 logs");
});

test("jumps between errors in both directions", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderLogList(receiver);
  await app.waitForSelection(NOTICE_ROW);

  app.mockInput.pressKey("e");
  expect(await app.waitForSelection("out of memory")).toBe(FATAL_ROW);
  app.mockInput.pressKey("e");
  expect(await app.waitForSelection("charge failed")).toBe(ERROR_ROW);
  app.mockInput.pressKey("e");
  expect(await app.waitForSelection("out of memory")).toBe(FATAL_ROW);
  app.mockInput.pressKey("e", { shift: true });
  expect(await app.waitForSelection("charge failed")).toBe(ERROR_ROW);
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

test("opens the selected log's trace in the traces view", async () => {
  await using receiver = await startTestReceiver();
  await receiver.send(
    "/v1/traces",
    tracesRequest({
      service: "checkout",
      spans: [
        {
          traceId: CHECKOUT_TRACE_ID,
          spanId: ORDER_SPAN_ID,
          name: "POST /checkout",
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
    `POST /checkout ${CHECKOUT_TRACE_ID}`,
    "● checkout 12:00:00.000 1 span 2.50s",
  ]);

  app.mockInput.pressEscape();
  frame = await app.waitForFrame((frame) =>
    textLines(frame).includes("12:00:00.000 ● checkout POST /checkout 1 2.50s"),
  );
  expect(textLines(frame)[1]).toBe("1 trace");
});

test("lists identical logs separately and selects each in turn", async () => {
  await using receiver = await startTestReceiver();
  const repeated = { time: at(1000), severityNumber: SEVERITY_NUMBER.info, body: "heartbeat" };
  const earlier = { time: at(0), severityNumber: SEVERITY_NUMBER.info, body: "started" };
  await receiver.send(
    "/v1/logs",
    logsRequest({ service: "worker", logs: [repeated, repeated, earlier] }),
  );
  await using app = await renderLogs(receiver);

  const frame = await app.waitForFrame((frame) => logRows(frame).length === 3);
  expect(logRows(frame)).toEqual([
    "12:00:01.000 INFO ● worker heartbeat",
    "12:00:01.000 INFO ● worker heartbeat",
    "12:00:00.000 INFO ● worker started",
  ]);

  const firstRowLine = frame.split("\n").findIndex((line) => line.includes("heartbeat"));
  await app.waitForSelection("heartbeat", { line: firstRowLine });
  app.mockInput.pressArrow("down");
  await app.waitForSelection("heartbeat", { line: firstRowLine + 1 });
  app.mockInput.pressArrow("down");
  await app.waitForSelection("started");
});

test("scrolls the log panel down and back up", async () => {
  await using receiver = await startTestReceiver();
  const body = Array.from({ length: 40 }, (_, index) => `line ${index + 1}`).join("\n");
  await receiver.send(
    "/v1/logs",
    logsRequest({ service: "worker", logs: [{ time: at(0), body }] }),
  );
  await using app = await renderLogs(receiver);
  await app.waitForFrame((frame) => panelLines(frame).includes("line 1"));

  app.mockInput.pressKey("d", { ctrl: true });
  await app.waitForFrame((frame) => !panelLines(frame).includes("line 1"));

  app.mockInput.pressKey("u", { ctrl: true });
  await app.waitForFrame((frame) => panelLines(frame).includes("line 1"));
});

test("shows an error when logs cannot be loaded", async () => {
  await using receiver = await startTestReceiver();
  const connection = await receiver.connect();
  await connection.run("DROP TABLE otlp_logs");

  await using app = await renderLogs(receiver);

  await app.waitForFrame((frame) => frame.includes("Failed to load logs"));
});
