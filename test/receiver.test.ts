import { afterAll, beforeAll, expect, test } from "bun:test";
import { startReceiver, type Receiver } from "../src/db/receiver.ts";

let receiver: Receiver;

beforeAll(async () => {
  receiver = await startReceiver({ port: 14318 });
});

afterAll(async () => {
  await receiver.close();
});

const resource = {
  attributes: [{ key: "service.name", value: { stringValue: "checkout" } }],
};

async function post(path: string, body: unknown) {
  return fetch(`${receiver.url}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function rows(sql: string) {
  const reader = await receiver.connection.runAndReadAll(sql);
  return reader.getRowObjects();
}

test("stores traces", async () => {
  const response = await post("/v1/traces", {
    resourceSpans: [
      {
        resource,
        scopeSpans: [
          {
            spans: [
              {
                traceId: "5b8efff798038103d269b633813fc60c",
                spanId: "eee19b7ec3c1b174",
                name: "GET /cart",
                kind: 2,
                startTimeUnixNano: "1700000000000000000",
                endTimeUnixNano: "1700000001000000000",
              },
            ],
          },
        ],
      },
    ],
  });
  expect(response.ok).toBe(true);
  await receiver.flush();
  expect(await rows("SELECT service_name, name FROM otlp_traces")).toEqual([
    { service_name: "checkout", name: "GET /cart" },
  ]);
});

test("stores logs", async () => {
  const response = await post("/v1/logs", {
    resourceLogs: [
      {
        resource,
        scopeLogs: [
          {
            logRecords: [
              {
                timeUnixNano: "1700000000000000000",
                severityText: "ERROR",
                body: { stringValue: "boom" },
              },
            ],
          },
        ],
      },
    ],
  });
  expect(response.ok).toBe(true);
  await receiver.flush();
  expect(await rows("SELECT service_name, severity_text, body FROM otlp_logs")).toEqual([
    { service_name: "checkout", severity_text: "ERROR", body: "boom" },
  ]);
});

test("stores metrics", async () => {
  const response = await post("/v1/metrics", {
    resourceMetrics: [
      {
        resource,
        scopeMetrics: [
          {
            metrics: [
              {
                name: "queue.depth",
                gauge: {
                  dataPoints: [{ timeUnixNano: "1700000000000000000", asInt: "4" }],
                },
              },
            ],
          },
        ],
      },
    ],
  });
  expect(response.ok).toBe(true);
  await receiver.flush();
  expect(await rows("SELECT name, int_value FROM otlp_metrics_gauge")).toEqual([
    { name: "queue.depth", int_value: 4n },
  ]);
});

test("rejects unknown paths", async () => {
  const response = await post("/v1/unknown", {});
  expect(response.ok).toBe(false);
});
