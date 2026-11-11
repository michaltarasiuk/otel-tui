import { expect, test } from "bun:test";

import { bucketStart, TIME_BUCKET_MS, TimeBucket } from "#telemetry/time-buckets.ts";
import { tracesRequest } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import traceTimeline from "#traces/sql/trace-timeline.sql" with { type: "text" };

const MIDDLE_OF_BUCKET_MS = TIME_BUCKET_MS / 2;
const newestBucketMs = bucketStart(Date.now());
const now = newestBucketMs + MIDDLE_OF_BUCKET_MS;

function traceAt(index: number, startMs: number) {
  return {
    traceId: (index + 1).toString(16).padStart(32, "0"),
    spanId: (index + 1).toString(16).padStart(16, "0"),
    name: "GET /api/cart",
    start: new Date(startMs),
    end: new Date(startMs + 5),
  };
}

async function loadTimeline(agesMs: number[]) {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/traces",
    tracesRequest({
      service: "frontend",
      spans: agesMs.map((ageMs, index) => traceAt(index, now - ageMs)),
    }),
  );
  const connection = await receiver.connect();
  const reader = await connection.runAndReadAll(traceTimeline, {
    pattern: "%",
    attributes: "[]",
    serviceName: null,
    operationName: null,
    errorsOnly: false,
    bucketMs: TIME_BUCKET_MS,
    endMs: newestBucketMs + TIME_BUCKET_MS,
  });
  return TimeBucket.array().parse(reader.getRowObjectsJS());
}

function totalCount(columns: TimeBucket[]) {
  return columns.reduce((total, column) => total + column.count, 0);
}

test("keeps every trace, however far back it goes", async () => {
  const ages = Array.from({ length: 300 }, (_, index) => index * 60 * 1000);

  const columns = await loadTimeline(ages);

  expect(totalCount(columns)).toBe(300);
});

test("groups traces into buckets of a fixed width, oldest first", async () => {
  const ages = [1000, 2000, 16_000, 17_000, 18_000];

  const columns = await loadTimeline(ages);

  expect(columns.map((column) => column.count)).toEqual([3, 2]);
  expect(columns.every((column) => column.from % TIME_BUCKET_MS === 0)).toBe(true);
  expect(columns.map((column) => column.from)).toEqual(
    columns.map((column) => column.from).toSorted((a, b) => a - b),
  );
});

test("leaves out traces dated after now", async () => {
  const ages = [300_000, 200_000, 100_000, 10_000, -25_000, -60 * 60 * 1000];

  const columns = await loadTimeline(ages);

  expect(totalCount(columns)).toBe(4);
  expect(Math.max(...columns.map((column) => column.from))).toBeLessThanOrEqual(newestBucketMs);
});
