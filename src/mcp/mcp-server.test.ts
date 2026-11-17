import { expect, test } from "bun:test";

import { at, fakeClock } from "#testing/clock.ts";
import { startTestMcp } from "#testing/mcp.ts";
import { logsRequest, metricsRequest, SEVERITY_NUMBER, TEMPORALITY } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import {
  cartTraceId,
  CHARGE_FAILED,
  checkoutTraceId,
  otlpTraces,
  GET_CART,
  PLACE_ORDER,
  slowCartTraceId,
  slowCartTraces,
  statusTraceId,
} from "#testing/traces.ts";

import { StartupError } from "../startup-error.ts";
import { startMcpServer } from "./mcp-server.ts";

test("lists read-only tools for each view", async () => {
  await using receiver = await startTestReceiver();
  await using mcp = await startTestMcp(receiver);

  const { tools } = await mcp.client.listTools();

  expect(tools.map((tool) => tool.name).toSorted()).toEqual([
    "compare_traces",
    "get_metric",
    "get_service_map",
    "get_span",
    "get_trace",
    "list_logs",
    "list_metrics",
    "list_operations",
    "list_services",
    "list_traces",
  ]);
  expect(tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
});

test("lists traces with the same search as the app", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await using mcp = await startTestMcp(receiver);

  expect(await mcp.callJson("list_traces")).toEqual([
    expect.objectContaining({ trace_id: statusTraceId }),
    expect.objectContaining({ trace_id: checkoutTraceId }),
    expect.objectContaining({ trace_id: cartTraceId }),
  ]);
  expect(await mcp.callJson("list_traces", { search: "duration>200ms" })).toEqual([
    expect.objectContaining({ trace_id: checkoutTraceId, error_count: 2 }),
  ]);
});

test("outlines a trace's spans with the critical path and errors", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await using mcp = await startTestMcp(receiver);

  const outline = await mcp.callText("get_trace", { trace_id: checkoutTraceId });

  const lines = outline.split("\n");
  expect(lines[0]).toBe(`trace ${checkoutTraceId}: 3 spans, 500.0ms, 2 with errors`);
  expect(lines).toContain(
    `* ${PLACE_ORDER} [checkout, server] 450.0ms at +0µs ${"2a".repeat(8)} ERROR: ${CHARGE_FAILED}`,
  );
  expect(lines.some((line) => line.startsWith("*   charge [payment, client] 300.0ms"))).toBe(true);
});

test("compares two traces by self time", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await receiver.sendHttp("/v1/traces", slowCartTraces);
  await using mcp = await startTestMcp(receiver);

  const comparison = await mcp.callJson("compare_traces", {
    before_trace_id: cartTraceId,
    after_trace_id: slowCartTraceId,
  });

  expect(comparison).toMatchObject({
    before: { trace_id: cartTraceId, duration_ms: 120, span_count: 3, error_count: 0 },
    after: { trace_id: slowCartTraceId, duration_ms: 300, span_count: 4, error_count: 0 },
    changed_spans: [
      { name: "GET /api/cart", change: "changed", self_delta_ms: 20 },
      { name: GET_CART, change: "changed", self_delta_ms: 20 },
      { name: "valkey-cart:6379", change: "added", before_span_id: null, self_delta_ms: 140 },
    ],
    changed_spans_left_out: 0,
    operations: [
      { name: "valkey-cart:6379", before_count: 1, after_count: 2, after_self_ms: 200 },
      { name: "GET /api/cart" },
      { name: GET_CART },
    ],
  });
});

test("refuses to compare traces with different root spans", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await using mcp = await startTestMcp(receiver);

  const text = await mcp.callText("compare_traces", {
    before_trace_id: cartTraceId,
    after_trace_id: checkoutTraceId,
  });

  expect(text).toBe("The traces start with different root spans, so they don't compare");
});

test("reads a span's attributes and resource", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await using mcp = await startTestMcp(receiver);

  const span = await mcp.callJson("get_span", { trace_id: cartTraceId, span_id: "1a".repeat(8) });

  expect(span).toMatchObject({
    attributes: { "http.route": "/api/cart" },
    resource: { "service.name": "frontend", "host.name": "colima" },
  });
});

test("lists services and their operations", async () => {
  fakeClock(at(60_000));
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await using mcp = await startTestMcp(receiver);

  const services = await mcp.callJson("list_services");
  const operations = await mcp.callJson("list_operations", { service: "checkout" });

  expect(services).toContainEqual(expect.objectContaining({ service_name: "checkout" }));
  expect(operations).toEqual([expect.objectContaining({ name: PLACE_ORDER, error_ratio: 1 })]);
});

test("maps calls between services and to external peers", async () => {
  fakeClock(at(60_000));
  await using receiver = await startTestReceiver();
  await receiver.sendHttp("/v1/traces", otlpTraces);
  await using mcp = await startTestMcp(receiver);

  const calls = await mcp.callJson("get_service_map");

  expect(calls).toEqual([
    expect.objectContaining({ caller: "cart", callee: "redis", is_external: true }),
    expect.objectContaining({ caller: "checkout", callee: "payment", error_ratio: 1 }),
    expect.objectContaining({ caller: "frontend", callee: "cart", is_external: false }),
  ]);
});

test("lists logs at or above a severity", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({
      service: "cart",
      logs: [
        { time: new Date(), body: "cart loaded", severityNumber: SEVERITY_NUMBER.info },
        { time: new Date(), body: "cart failed", severityNumber: SEVERITY_NUMBER.error },
      ],
    }),
  );
  await using mcp = await startTestMcp(receiver);

  const logs = await mcp.callJson("list_logs", { min_severity: "WARN" });

  expect(logs).toEqual([
    expect.objectContaining({ severity: "ERROR", service: "cart", body: "cart failed" }),
  ]);
});

test("reads a metric's series", async () => {
  await using receiver = await startTestReceiver();
  await receiver.sendHttp(
    "/v1/metrics",
    metricsRequest({
      service: "frontend",
      metrics: [
        {
          name: "v8js.memory.heap.used",
          gauge: [
            { time: new Date(Date.now() - 1000), value: 4 },
            { time: new Date(), value: 6 },
          ],
        },
      ],
    }),
  );
  await using mcp = await startTestMcp(receiver);

  const metrics = await mcp.callJson("get_metric", { name: "v8js.memory.heap.used" });

  expect(metrics).toEqual([
    expect.objectContaining({
      name: "v8js.memory.heap.used",
      type: "gauge",
      service: "frontend",
      series: [expect.objectContaining({ last: 6, min: 4, max: 6 })],
    }),
  ]);
});

test("reads a counter's rate and total like the app", async () => {
  await using receiver = await startTestReceiver();
  const start = new Date(Date.now() - 30_000);
  await receiver.sendHttp(
    "/v1/metrics",
    metricsRequest({
      service: "frontend",
      metrics: [
        {
          name: "http.server.requests",
          sum: [
            { start, time: new Date(start.getTime() + 10_000), value: 10 },
            { start, time: new Date(start.getTime() + 20_000), value: 30 },
          ],
          monotonic: true,
          temporality: TEMPORALITY.cumulative,
        },
      ],
    }),
  );
  await using mcp = await startTestMcp(receiver);

  const metrics = await mcp.callJson("get_metric", { name: "http.server.requests" });

  expect(metrics).toEqual([
    expect.objectContaining({
      type: "counter",
      series: [expect.objectContaining({ rate_per_second: 2, total: 30 })],
    }),
  ]);
});

test("finds a metric by its exact name among many that contain it", async () => {
  await using receiver = await startTestReceiver();
  const containing = Array.from({ length: 600 }, (_, index) => ({
    name: `app.requests.${index}`,
    gauge: [{ time: new Date(), value: index }],
  }));
  const exact = { name: "requests", gauge: [{ time: new Date(), value: 7 }] };
  await receiver.sendHttp(
    "/v1/metrics",
    metricsRequest({ service: "frontend", metrics: [...containing, exact] }),
  );
  await using mcp = await startTestMcp(receiver);

  const metrics = await mcp.callJson("get_metric", { name: "requests" });

  expect(metrics).toEqual([
    expect.objectContaining({ name: "requests", series: [expect.objectContaining({ last: 7 })] }),
  ]);
});

test("refuses requests from other hosts and origins", async () => {
  await using receiver = await startTestReceiver();
  await using mcp = await startTestMcp(receiver);
  const ping = { jsonrpc: "2.0", id: 1, method: "ping" };
  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };

  const foreignOrigin = await fetch(mcp.url, {
    method: "POST",
    headers: { ...headers, origin: "http://evil.example" },
    body: JSON.stringify(ping),
  });
  const foreignHost = await fetch(mcp.url, {
    method: "POST",
    headers: { ...headers, host: "evil.example" },
    body: JSON.stringify(ping),
  });

  expect(foreignOrigin.status).toBe(403);
  expect(foreignHost.status).toBe(403);
});

test("names the port when it can't serve on it", async () => {
  await using receiver = await startTestReceiver();
  await using mcp = await startTestMcp(receiver);
  const { port } = new URL(mcp.url);

  const connection = await receiver.connect();

  expect(() => startMcpServer({ connection, port: Number(port), version: "0.0.0" })).toThrow(
    StartupError,
  );
});
