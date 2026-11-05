import { afterEach, expect, jest, mock, spyOn, test } from "bun:test";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";

import type { DuckDBConnection } from "@duckdb/node-api";
import { z } from "zod";

import { logsRequest, metricsRequest, TEMPORALITY, tracesRequest } from "../testing/otlp.ts";
import { startTestReceiver, type TestReceiver } from "../testing/receiver.ts";
import { PRUNE_INTERVAL_MS } from "./receiver.ts";

const TABLES = [
  "otlp_traces",
  "otlp_logs",
  "otlp_metrics_gauge",
  "otlp_metrics_sum",
  "otlp_metrics_histogram",
  "otlp_metrics_exp_histogram",
];

const LOGS_EXPORT = "/opentelemetry.proto.collector.logs.v1.LogsService/Export";

const RETENTION_MS = 60 * 1000;
const RETENTION_EXPIRED_LOG_COUNT = 10_000;

const MEMORY_LIMIT_BYTES = 8 * 1024 * 1024;
const MEMORY_BATCH_COUNT = 20;
const MEMORY_BATCH_SIZE = 5000;

const PRUNE_TIMEOUT_MS = 3000;
const PRUNE_POLL_INTERVAL_MS = 10;

async function sendOneOfEach(receiver: TestReceiver, time: Date) {
  const end = new Date(time.getTime() + 1);
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "frontend",
      spans: [
        {
          traceId: "1".repeat(32),
          spanId: "1".repeat(16),
          name: "GET /api/cart",
          start: time,
          end,
        },
      ],
    }),
  );
  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({
      service: "cart",
      logs: [
        {
          time,
          body: "GetCartAsync called with userId={userId}",
        },
      ],
    }),
  );
  await receiver.sendHttp(
    "/v1/metrics",
    metricsRequest({
      service: "frontend",
      metrics: [
        {
          name: "v8js.memory.heap.used",
          gauge: [{ time, value: 4 }],
        },
        {
          name: "nodejs.eventloop.time",
          sum: [{ start: time, time, value: 1 }],
          monotonic: true,
          temporality: TEMPORALITY.cumulative,
        },
        {
          name: "http.server.request.duration",
          histogram: [{ start: time, time, count: 1, bounds: [10], counts: [1, 0] }],
          temporality: TEMPORALITY.cumulative,
        },
        {
          name: "v8js.gc.duration",
          exponentialHistogram: [
            { start: time, time, count: 1, scale: 0, positive: { offset: 0, counts: [1] } },
          ],
          temporality: TEMPORALITY.cumulative,
        },
      ],
    }),
  );
}

function uncompressibleCartLog() {
  return `GetCartAsync called with userId=${crypto.randomUUID()} cartId=${crypto.randomUUID()} sessionId=${crypto.randomUUID()}`;
}

async function sendLogBatches(receiver: TestReceiver) {
  const start = Date.now() - MEMORY_BATCH_COUNT * 1000;
  const times = Array.from(
    { length: MEMORY_BATCH_COUNT },
    (_, batch) => new Date(start + batch * 1000),
  );
  for (const time of times) {
    await receiver.sendHttp(
      "/v1/logs",
      logsRequest({
        service: "cart",
        logs: Array.from({ length: MEMORY_BATCH_SIZE }, () => ({
          time,
          body: uncompressibleCartLog(),
        })),
      }),
    );
  }
  return times;
}

async function logCountAt(connection: DuckDBConnection, time: Date) {
  const reader = await connection.runAndReadAll(
    "SELECT count(*)::INTEGER FROM otlp_logs WHERE epoch_ms(time_unix_nano) = $timeMs",
    { timeMs: time.getTime() },
  );
  return z.number().parse(reader.value(0, 0));
}

async function rowCounts(connection: DuckDBConnection) {
  const reader = await connection.runAndReadAll(
    TABLES.map(
      (table) => `SELECT '${table}' AS name, count(*)::INTEGER AS rows FROM ${table}`,
    ).join(" UNION ALL "),
  );
  return Object.fromEntries(reader.getRowObjectsJS().map(({ name, rows }) => [name, rows]));
}

async function tableMemoryBytes(connection: DuckDBConnection) {
  const reader = await connection.runAndReadAll(
    "SELECT memory_usage_bytes::INTEGER FROM duckdb_memory() WHERE tag = 'IN_MEMORY_TABLE'",
  );
  return z.number().parse(reader.value(0, 0));
}

async function spillDirectory(connection: DuckDBConnection) {
  const reader = await connection.runAndReadAll("SELECT current_setting('temp_directory')");
  return z.string().parse(reader.value(0, 0));
}

function eachTableWith(rows: number) {
  return Object.fromEntries(TABLES.map((table) => [table, rows]));
}

function triggerPrune() {
  jest.advanceTimersByTime(PRUNE_INTERVAL_MS);
  jest.useRealTimers();
}

async function pollUntil<T>(read: () => T | Promise<T>, isDone: (value: T) => boolean) {
  const deadline = performance.now() + PRUNE_TIMEOUT_MS;
  let value = await read();
  while (!isDone(value) && performance.now() < deadline) {
    await Bun.sleep(PRUNE_POLL_INTERVAL_MS);
    value = await read();
  }
  return value;
}

function pruneAndWaitFor(connection: DuckDBConnection, expected: Record<string, number>) {
  triggerPrune();
  return pollUntil(
    () => rowCounts(connection),
    (counts) => Bun.deepEquals(counts, expected),
  );
}

afterEach(() => {
  jest.useRealTimers();
  mock.restore();
});

test("listens for OTLP/HTTP and OTLP/gRPC on the IPv4 loopback address", async () => {
  await using receiver = await startTestReceiver();

  expect(receiver.urls).toEqual({
    http: expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+$/),
    grpc: expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+$/),
  });
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

  expect(await pruneAndWaitFor(connection, eachTableWith(1))).toEqual(eachTableWith(1));
});

test("drops logs by their observed time when they carry no time", async () => {
  jest.useFakeTimers();
  await using receiver = await startTestReceiver({ retentionMs: RETENTION_MS });
  const connection = await receiver.connect();

  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({
      service: "shipping",
      logs: [
        { observedTime: new Date(Date.now() - 2 * RETENTION_MS), body: "Requesting quote" },
        { observedTime: new Date(), body: "Sending Quote" },
      ],
    }),
  );

  const expected = { ...eachTableWith(0), otlp_logs: 1 };
  expect(await pruneAndWaitFor(connection, expected)).toEqual(expected);
});

test("drops logs that carry neither a time nor an observed time", async () => {
  jest.useFakeTimers();
  await using receiver = await startTestReceiver({ retentionMs: RETENTION_MS });
  const connection = await receiver.connect();

  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({ service: "shipping", logs: [{ body: "Requesting quote" }] }),
  );

  expect(await pruneAndWaitFor(connection, eachTableWith(0))).toEqual(eachTableWith(0));
});

test("releases the memory of pruned telemetry", async () => {
  jest.useFakeTimers();
  await using receiver = await startTestReceiver({ retentionMs: RETENTION_MS });
  const connection = await receiver.connect();
  const expired = new Date(Date.now() - 2 * RETENTION_MS);

  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({
      service: "cart",
      logs: Array.from({ length: RETENTION_EXPIRED_LOG_COUNT }, (_, index) => ({
        time: expired,
        body: `GetCartAsync called with userId=${index}`,
      })),
    }),
  );

  expect(await tableMemoryBytes(connection)).toBeGreaterThan(0);

  triggerPrune();

  expect(
    await pollUntil(
      () => tableMemoryBytes(connection),
      (bytes) => bytes === 0,
    ),
  ).toBe(0);
});

test("accepts telemetry beyond its memory limit", async () => {
  jest.useFakeTimers();
  await using receiver = await startTestReceiver({ memoryLimitBytes: MEMORY_LIMIT_BYTES });
  const connection = await receiver.connect();

  await sendLogBatches(receiver);

  expect(await rowCounts(connection)).toEqual({
    ...eachTableWith(0),
    otlp_logs: MEMORY_BATCH_COUNT * MEMORY_BATCH_SIZE,
  });
});

test("drops the oldest telemetry when it nears the memory limit", async () => {
  jest.useFakeTimers();
  await using receiver = await startTestReceiver({ memoryLimitBytes: MEMORY_LIMIT_BYTES });
  const connection = await receiver.connect();

  const times = await sendLogBatches(receiver);
  const oldest = times.at(0)!;
  const newest = times.at(-1)!;

  triggerPrune();

  expect(
    await pollUntil(
      () => logCountAt(connection, oldest),
      (count) => count === 0,
    ),
  ).toBe(0);
  expect(await logCountAt(connection, newest)).toBe(MEMORY_BATCH_SIZE);
});

test("spills to a temporary directory only while it needs one", async () => {
  jest.useFakeTimers();
  const receiver = await startTestReceiver({ memoryLimitBytes: MEMORY_LIMIT_BYTES });
  const directory = await spillDirectory(await receiver.connect());

  expect(directory).toStartWith(tmpdir());
  expect(existsSync(directory)).toBe(false);

  await sendLogBatches(receiver);

  expect(existsSync(directory)).toBe(true);

  await receiver[Symbol.asyncDispose]();

  expect(existsSync(directory)).toBe(false);
});

test("reports a failed prune and keeps running", async () => {
  jest.useFakeTimers();
  const consoleError = spyOn(console, "error").mockImplementation(() => {});
  await using receiver = await startTestReceiver({ retentionMs: RETENTION_MS });
  const connection = await receiver.connect();

  await connection.run("DROP TABLE otlp_traces");

  triggerPrune();

  await pollUntil(
    () => consoleError.mock.calls.length,
    (calls) => calls > 0,
  );
  expect(consoleError).toHaveBeenCalledWith("Failed to prune telemetry", expect.any(Error));
});

test("closes its connections and stops listening when disposed", async () => {
  const receiver = await startTestReceiver();
  const connection = await receiver.connect();

  await receiver[Symbol.asyncDispose]();

  expect(connection.run("SELECT 1")).rejects.toThrow("connection disconnected");
  expect(fetch(`${receiver.urls.http}/v1/logs`, { method: "POST", body: "{}" })).rejects.toThrow();
  expect(receiver.sendGrpc(LOGS_EXPORT)).rejects.toThrow();
});
