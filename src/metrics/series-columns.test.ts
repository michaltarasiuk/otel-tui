import { describe, expect, test } from "bun:test";

import {
  type AttributeColumn,
  attributeColumns,
  cellValue,
  seriesLabel,
  sortByColumns,
} from "./series-columns.ts";
import type { Series } from "./series.ts";

function toAttributes(values: Record<string, string>) {
  return Object.entries(values).map(([key, value]) => ({ key, value }));
}

function series(
  seriesId: string,
  attributes: Record<string, string>,
  resourceAttributes: Record<string, string> = {},
): Series {
  return {
    series_id: seriesId,
    scope_id: "",
    scope_name: null,
    scope_version: null,
    attributes: toAttributes(attributes),
    resource_attributes: toAttributes(resourceAttributes),
    first_time: 0,
    last_time: 0,
    stats: { kind: "number", value: 0, min: 0, max: 0, latestPoints: [] },
  };
}

const FRONTEND_INSTANCE_ID = "efe50e2b-c27e-4d60-b585-525713841890";

describe("attributeColumns", () => {
  test("shows every attribute of a lone series and no resource attributes", () => {
    const lone = series(
      "1",
      { "http.request.method": "GET", "http.route": "/api/cart" },
      { "host.name": "colima" },
    );

    expect(attributeColumns([lone])).toEqual([
      { key: "http.request.method", source: "attributes", weight: 8 },
      { key: "http.route", source: "attributes", weight: 9 },
    ]);
  });

  test("shows only attributes that tell series apart, fewest values first", () => {
    const rows = [
      series(
        "1",
        { "http.route": "/api/cart", "http.request.method": "GET" },
        { "service.instance.id": FRONTEND_INSTANCE_ID, "service.namespace": "opentelemetry-demo" },
      ),
      series(
        "2",
        { "http.route": "/api/currency", "http.request.method": "GET" },
        { "service.instance.id": FRONTEND_INSTANCE_ID, "service.namespace": "opentelemetry-demo" },
      ),
      series(
        "3",
        {
          "http.route": "/api/data",
          "http.request.method": "GET",
          "http.response.status_code": "500",
        },
        {
          "service.instance.id": "a1d5c3f0-6f2e-4b8a-9c47-2f0e8d6b1a93",
          "service.namespace": "opentelemetry-demo",
        },
      ),
    ];

    expect(attributeColumns(rows)).toEqual([
      { key: "http.response.status_code", source: "attributes", weight: 8 },
      { key: "http.route", source: "attributes", weight: 13 },
      { key: "service.instance.id", source: "resource_attributes", weight: 32 },
    ]);
  });

  test("weighs a column by its longest value within limits", () => {
    const rows = [
      series("1", {
        "http.route": "/api/products/[productId]/index",
        "user_agent.original": "python-requests/2.34.2",
      }),
      series("2", {
        "http.route": "/",
        "user_agent.original":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/149.0.0.0 Safari/537.36",
      }),
    ];

    expect(attributeColumns(rows).map((column) => column.weight)).toEqual([31, 32]);
  });
});

describe("seriesLabel", () => {
  const method: AttributeColumn = { key: "http.request.method", source: "attributes", weight: 8 };
  const route: AttributeColumn = { key: "http.route", source: "attributes", weight: 8 };

  test("joins the series' column values", () => {
    const row = series("1", { "http.request.method": "GET", "http.route": "/api/cart" });

    expect(seriesLabel(row, [method, route])).toBe("GET · /api/cart");
  });

  test("skips columns the series has no value for", () => {
    const row = series("1", { "http.route": "/api/cart" });

    expect(cellValue(row, method)).toBe("");
    expect(seriesLabel(row, [method, route])).toBe("/api/cart");
  });

  test("names a series without attributes", () => {
    expect(seriesLabel(series("1", {}), [])).toBe("no attributes");
  });
});

describe("sortByColumns", () => {
  test("orders series by each column in turn, then by ID", () => {
    const rows = [
      series("1", { "http.request.method": "POST", "http.route": "/api/cart" }),
      series("2", { "http.request.method": "GET", "http.route": "/api/currency" }),
      series("4", { "http.request.method": "GET", "http.route": "/api/cart" }),
      series("3", { "http.request.method": "GET", "http.route": "/api/cart" }),
    ];
    const columns = attributeColumns(rows);

    expect(columns.map((column) => column.key)).toEqual(["http.request.method", "http.route"]);
    expect(sortByColumns(rows, columns).map((row) => row.series_id)).toEqual(["3", "4", "2", "1"]);
  });
});
