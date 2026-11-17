import { beforeEach, expect, test } from "bun:test";

import { renderPage } from "#testing/app.tsx";
import { at, fakeClock } from "#testing/clock.ts";
import { SPAN_KIND, tracesRequest } from "#testing/otlp.ts";
import { startTestReceiver, type TestReceiver } from "#testing/receiver.ts";
import { keyHints, pageHeader, textLines } from "#testing/screen.ts";
import { otlpTraces } from "#testing/traces.ts";

const MAP_ROWS = [
  "● checkout",
  "● payment 0.2/min 100.0% 300.0ms 300.0ms 300.0ms 1",
  "● frontend",
  "● cart 0.2/min 0.0% 80.0ms 80.0ms 80.0ms 1",
  "○ redis 0.2/min 0.0% 60.0ms 60.0ms 60.0ms 1",
];

beforeEach(() => {
  fakeClock(at(60_000));
});

function mapRows(frame: string) {
  const lines = textLines(frame);
  const header = lines.findIndex((line) => line.startsWith("Service Rate"));
  return header === -1 ? [] : lines.slice(header + 1, -1);
}

async function renderMap(receiver: TestReceiver) {
  const app = await renderPage(receiver, "services");
  app.mockInput.pressKey("m");
  await app.waitForFrame((frame) => / dependenc(y|ies)$/.test(pageHeader(frame)));
  return app;
}

test("waits for spans that call another service", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderMap(receiver);

  const frame = await app.waitForFrame((frame) =>
    frame.includes("Waiting for spans that call another service..."),
  );
  expect(pageHeader(frame)).toBe("last 5 min 0 dependencies");
});

test("nests each service's calls under it, with external peers as hollow leaves", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await using app = await renderMap(receiver);

  const frame = await app.waitForFrame((frame) => mapRows(frame).length === MAP_ROWS.length);

  expect(pageHeader(frame)).toBe("last 5 min 3 dependencies");
  expect(mapRows(frame)).toEqual(MAP_ROWS);
  expect(frame).toContain("    ○ redis");
});

test("shows a peer even when its client span has children in the same service", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "orders",
      spans: [
        {
          traceId: "7".repeat(32),
          spanId: "7a".repeat(8),
          name: "SELECT orders",
          kind: SPAN_KIND.client,
          start: at(0),
          end: at(30),
          attributes: { "db.system.name": "postgresql" },
        },
        {
          traceId: "7".repeat(32),
          spanId: "7b".repeat(8),
          parentSpanId: "7a".repeat(8),
          name: "connect",
          start: at(0),
          end: at(5),
        },
      ],
    }),
  );
  await using app = await renderMap(receiver);

  const frame = await app.waitForFrame((frame) => mapRows(frame).length === 2);

  expect(mapRows(frame)).toEqual(["● orders", "○ postgresql 0.2/min 0.0% 30.0ms 30.0ms 30.0ms 1"]);
});

test("opens a called service's traces and comes back to the map", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await using app = await renderMap(receiver);
  await app.waitForFrame((frame) => mapRows(frame).length === MAP_ROWS.length);

  app.mockInput.pressArrow("down");
  await app.waitForSelection("payment");
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => pageHeader(frame).startsWith("● payment"));

  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => / dependenc(y|ies)$/.test(pageHeader(frame)));
  app.mockInput.pressEscape();
  await app.waitForFrame((frame) => pageHeader(frame) === "last 5 min 4 services");
});

test("has no traces key on an external peer", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await using app = await renderMap(receiver);
  await app.waitForFrame((frame) => mapRows(frame).length === MAP_ROWS.length);

  for (const row of ["payment", "frontend", "cart"]) {
    app.mockInput.pressArrow("down");
    await app.waitForSelection(row);
  }
  app.mockInput.pressArrow("down");
  const frame = await app.waitForSelection("redis");

  expect(keyHints(frame)).not.toContain("return traces");
});
