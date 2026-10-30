import { afterEach, expect, jest, mock, spyOn, test } from "bun:test";

import type { DuckDBConnection } from "@duckdb/node-api";

import { logsRequest, metricsRequest, TEMPORALITY, tracesRequest } from "../testing/otlp.ts";
import { startTestReceiver, type TestReceiver } from "../testing/receiver.ts";
import { MILLISECONDS_PER_MINUTE } from "../utils/time-units.ts";
import { PRUNE_INTERVAL_MS } from "./receiver.ts";

const TABLES = [
  "otlp_traces",
  "otlp_logs",
  "otlp_metrics_gauge",
  "otlp_metrics_sum",
  "otlp_metrics_histogram",
  "otlp_metrics_exp_histogram",
];

const RETENTION_MS = MILLISECONDS_PER_MINUTE;
const PRUNE_TIMEOUT_MS = 3000;
const PRUNE_POLL_INTERVAL_MS = 10;

async function sendOneOfEach(receiver: TestReceiver, time: Date) {
  const end = new Date(time.getTime() + 1);
  await receiver.send(
    "/v1/traces",
    tracesRequest({
      service: "checkout",
      spans: [
        { traceId: "1".repeat(32), spanId: "1".repeat(16), name: "GET /cart", start: time, end },
      ],
    }),
  );
  await receiver.send(
    "/v1/logs",
    logsRequest({
      service: "checkout",
      logs: [{ time, body: "cart loaded" }],
    }),
  );
  await receiver.send(
    "/v1/metrics",
    metricsRequest({
      service: "checkout",
      metrics: [
        {
          name: "queue.depth",
          gauge: [{ time, value: 4 }],
        },
        {
          name: "orders",
          sum: [{ start: time, time, value: 1 }],
          monotonic: true,
          temporality: TEMPORALITY.cumulative,
        },
        {
          name: "latency",
          histogram: [{ start: time, time, count: 1, bounds: [10], counts: [1, 0] }],
          temporality: TEMPORALITY.cumulative,
        },
        {
          name: "size",
          exponentialHistogram: [
            { start: time, time, count: 1, scale: 0, positive: { offset: 0, counts: [1] } },
          ],
          temporality: TEMPORALITY.cumulative,
        },
      ],
    }),
  );
}

async function rowCounts(connection: DuckDBConnection) {
  const reader = await connection.runAndReadAll(
    TABLES.map(
      (table) => `SELECT '${table}' AS name, count(*)::INTEGER AS rows FROM ${table}`,
    ).join(" UNION ALL "),
  );
  return Object.fromEntries(reader.getRowObjectsJS().map(({ name, rows }) => [name, rows]));
}

function eachTableWith(rows: number) {
  return Object.fromEntries(TABLES.map((table) => [table, rows]));
}

afterEach(() => {
  jest.useRealTimers();
  mock.restore();
});

test("listens for OTLP/HTTP on the IPv4 loopback address", async () => {
  await using receiver = await startTestReceiver();

  expect(receiver.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
});

test("stores every signal where its connections can query it", async () => {
  await using receiver = await startTestReceiver();
  const connection = await receiver.connect();

  await sendOneOfEach(receiver, new Date());

  expect(await rowCounts(connection)).toEqual(eachTableWith(1));
});

test("drops telemetry older than the retention period", async () => {
  jest.useFakeTimers();
  await using receiver = await startTestReceiver({ retentionMs: RETENTION_MS });
  const connection = await receiver.connect();
  await sendOneOfEach(receiver, new Date(Date.now() - 2 * RETENTION_MS));
  await sendOneOfEach(receiver, new Date());
  expect(await rowCounts(connection)).toEqual(eachTableWith(2));

  jest.advanceTimersByTime(PRUNE_INTERVAL_MS);
  jest.useRealTimers();

  const deadline = performance.now() + PRUNE_TIMEOUT_MS;
  let counts = await rowCounts(connection);
  while (!Bun.deepEquals(counts, eachTableWith(1)) && performance.now() < deadline) {
    await Bun.sleep(PRUNE_POLL_INTERVAL_MS);
    counts = await rowCounts(connection);
  }
  expect(counts).toEqual(eachTableWith(1));
});

test("reports a failed prune and keeps running", async () => {
  jest.useFakeTimers();
  const consoleError = spyOn(console, "error").mockImplementation(() => {});
  await using receiver = await startTestReceiver({ retentionMs: RETENTION_MS });
  const connection = await receiver.connect();
  await connection.run("DROP TABLE otlp_traces");

  jest.advanceTimersByTime(PRUNE_INTERVAL_MS);
  jest.useRealTimers();

  const deadline = performance.now() + PRUNE_TIMEOUT_MS;
  while (consoleError.mock.calls.length === 0 && performance.now() < deadline) {
    await Bun.sleep(PRUNE_POLL_INTERVAL_MS);
  }
  expect(consoleError).toHaveBeenCalledWith("Failed to prune expired telemetry", expect.any(Error));
});

test("closes its connections and stops listening when disposed", async () => {
  const receiver = await startTestReceiver();
  const connection = await receiver.connect();

  await receiver[Symbol.asyncDispose]();

  expect(connection.run("SELECT 1")).rejects.toThrow("connection disconnected");
  expect(fetch(`${receiver.url}/v1/logs`, { method: "POST", body: "{}" })).rejects.toThrow();
});
