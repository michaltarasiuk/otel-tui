import { renderPage, selectRow } from "./app.tsx";
import { atSecond } from "./clock.ts";
import { metricsRequest, TEMPORALITY } from "./otlp.ts";
import type { TestReceiver } from "./receiver.ts";
import { tableRows } from "./screen.ts";

export const DETAILS_SIZE = { width: 120, height: 45 };

export function flagRequests(flag: string, values: number[]) {
  return values.map((value, index) => ({
    attributes: { "feature_flag.key": flag },
    start: atSecond(0),
    time: atSecond(10 * (index + 1)),
    value,
  }));
}

export const otlpMetrics = metricsRequest(
  {
    service: "shipping",
    scope: { name: "otel_demo.shipping.quote" },
    metrics: [
      {
        name: "demo.shipping.items_shipped",
        monotonic: true,
        temporality: TEMPORALITY.delta,
        sum: [
          { start: atSecond(0), time: atSecond(10), value: 3 },
          { start: atSecond(10), time: atSecond(20), value: 4 },
          { start: atSecond(20), time: atSecond(30), value: 5 },
        ],
      },
    ],
  },
  {
    service: "shipping",
    scope: { name: "opentelemetry-instrumentation-actix-web", version: "0.24.0" },
    metrics: [
      {
        name: "http.server.request.body.size",
        unit: "By",
        temporality: TEMPORALITY.cumulative,
        exponentialHistogram: [
          {
            start: atSecond(0),
            time: atSecond(10),
            count: 3,
            scale: 0,
            positive: { offset: 9, counts: [1, 2] },
          },
          {
            start: atSecond(0),
            time: atSecond(20),
            count: 6,
            scale: 0,
            positive: { offset: 9, counts: [2, 4] },
          },
        ],
      },
    ],
  },
  {
    service: "cart",
    scope: { name: "OpenFeature", version: "2.14.1.0" },
    metrics: [
      {
        name: "feature_flag.evaluation_requests_total",
        unit: "{request}",
        description: "feature flag evaluation request counter",
        monotonic: true,
        temporality: TEMPORALITY.cumulative,
        sum: [
          ...flagRequests("cartFailure", [100, 150, 250]),
          ...flagRequests("failedReadinessProbe", [20, 30, 50]),
        ],
      },
    ],
  },
  {
    service: "cart",
    scope: { name: "Microsoft.AspNetCore.Hosting" },
    metrics: [
      {
        name: "http.server.request.duration",
        unit: "s",
        temporality: TEMPORALITY.delta,
        histogram: [
          {
            start: atSecond(0),
            time: atSecond(10),
            count: 5,
            sum: 0.15,
            min: 0.005,
            max: 0.08,
            bounds: [0.01, 0.05, 0.1],
            counts: [1, 3, 1, 0],
            exemplars: [{ time: atSecond(9), value: 0.075 }],
          },
          {
            start: atSecond(10),
            time: atSecond(20),
            count: 5,
            sum: 0.4,
            min: 0.02,
            max: 0.15,
            bounds: [0.01, 0.05, 0.1],
            counts: [0, 2, 2, 1],
            exemplars: [
              { time: atSecond(19), value: 0.14, traceId: "2".repeat(32), spanId: "2b".repeat(8) },
            ],
          },
        ],
      },
    ],
  },
  {
    service: "cart",
    scope: { name: "OpenTelemetry.Instrumentation.Process", version: "1.18.0-rc.1" },
    metrics: [
      {
        name: "process.thread.count",
        unit: "{thread}",
        monotonic: false,
        temporality: TEMPORALITY.cumulative,
        sum: [
          { start: atSecond(0), time: atSecond(10), value: 5 },
          { start: atSecond(0), time: atSecond(20), value: 3 },
          { start: atSecond(0), time: atSecond(30), value: 8 },
        ],
      },
    ],
  },
  {
    service: "frontend",
    scope: { name: "@opentelemetry/instrumentation-runtime-node", version: "0.35.0" },
    metrics: [
      {
        name: "v8js.memory.heap.used",
        unit: "By",
        gauge: [
          { time: atSecond(10), value: 1_048_576 },
          { time: atSecond(20), value: 2_097_152 },
          { time: atSecond(30), value: 1_572_864 },
        ],
      },
    ],
  },
);

export const ITEMS_SHIPPED_ROW = "12:00:30.000 ● shipping demo.shipping.items_shipped counter 1";
export const FLAG_REQUESTS_ROW =
  "12:00:30.000 ● cart feature_flag.evaluation_requests_total counter {request} 2";
export const BODY_SIZE_ROW =
  "12:00:20.000 ● shipping http.server.request.body.size exp histogram By 1";
export const DURATION_ROW = "12:00:20.000 ● cart http.server.request.duration histogram s 1";
export const THREADS_ROW = "12:00:30.000 ● cart process.thread.count updowncounter {thread} 1";
export const HEAP_ROW = "12:00:30.000 ● frontend v8js.memory.heap.used gauge By 1";

export const BY_NAME = [
  ITEMS_SHIPPED_ROW,
  FLAG_REQUESTS_ROW,
  BODY_SIZE_ROW,
  DURATION_ROW,
  THREADS_ROW,
  HEAP_ROW,
];

interface ListOptions {
  size?: { width: number; height: number };
}

export async function renderMetricList(receiver: TestReceiver, { size }: ListOptions = {}) {
  await receiver.sendHttp("/v1/metrics", otlpMetrics);
  const app = await renderPage(receiver, "metrics", { size });
  await app.waitForFrame((frame) => tableRows(frame).length === BY_NAME.length);
  return app;
}

export async function openMetric(receiver: TestReceiver, row: string) {
  const app = await renderMetricList(receiver, { size: DETAILS_SIZE });
  await selectRow(app, BY_NAME, row);
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("escape back"));
  return app;
}
