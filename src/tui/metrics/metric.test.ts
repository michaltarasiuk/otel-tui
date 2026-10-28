import { expect, test } from "bun:test";

import { isDelta, type Metric, temporalityLabel, typeLabel } from "./metric.ts";

function withTemporality(temporality: number | null): Metric {
  return {
    metric_id: "1",
    type: "counter",
    temporality,
    name: "http.server.requests",
    unit: "{request}",
    service_name: "checkout",
    description: "",
    last_time: new Date(0),
    series_count: 1,
  };
}

test("labels exponential histograms briefly", () => {
  expect(typeLabel("exponential_histogram")).toBe("exp histogram");
  expect(typeLabel("updowncounter")).toBe("updowncounter");
});

test("reads OTLP aggregation temporality", () => {
  expect(isDelta(withTemporality(1))).toBe(true);
  expect(isDelta(withTemporality(2))).toBe(false);
  expect(temporalityLabel(withTemporality(1))).toBe("delta");
  expect(temporalityLabel(withTemporality(2))).toBe("cumulative");
});

test("has no temporality label for gauges", () => {
  expect(temporalityLabel(withTemporality(null))).toBeNull();
});
