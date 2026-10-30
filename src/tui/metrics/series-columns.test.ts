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
    scope_name: null,
    scope_version: null,
    attributes: toAttributes(attributes),
    resource_attributes: toAttributes(resourceAttributes),
    first_time: 0,
    last_time: 0,
    stats: { kind: "number", value: 0, min: 0, max: 0, latestPoints: [] },
  };
}

describe("attributeColumns", () => {
  test("shows every attribute of a lone series and no resource attributes", () => {
    const lone = series("1", { method: "GET", "http.route": "/a" }, { "host.name": "web-1" });

    expect(attributeColumns([lone])).toEqual([
      { key: "http.route", source: "attributes", weight: 8 },
      { key: "method", source: "attributes", weight: 8 },
    ]);
  });

  test("shows only attributes that tell series apart, fewest values first", () => {
    const rows = [
      series("1", { "http.route": "/a", method: "GET" }, { "host.name": "web-1", team: "shop" }),
      series("2", { "http.route": "/b", method: "GET" }, { "host.name": "web-1", team: "shop" }),
      series(
        "3",
        { "http.route": "/c", method: "GET", status: "500" },
        { "host.name": "web-2", team: "shop" },
      ),
    ];

    expect(attributeColumns(rows)).toEqual([
      { key: "status", source: "attributes", weight: 8 },
      { key: "http.route", source: "attributes", weight: 8 },
      { key: "host.name", source: "resource_attributes", weight: 8 },
    ]);
  });

  test("weighs a column by its longest value within limits", () => {
    const rows = [
      series("1", { "http.route": "/api/v1/orders/{id}/items", "user.agent": "curl" }),
      series("2", {
        "http.route": "/",
        "user.agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)",
      }),
    ];

    expect(attributeColumns(rows).map((column) => column.weight)).toEqual([25, 32]);
  });
});

describe("seriesLabel", () => {
  const method: AttributeColumn = { key: "method", source: "attributes", weight: 8 };
  const route: AttributeColumn = { key: "http.route", source: "attributes", weight: 8 };

  test("joins the series' column values", () => {
    const row = series("1", { method: "GET", "http.route": "/a" });

    expect(seriesLabel(row, [method, route])).toBe("GET · /a");
  });

  test("skips columns the series has no value for", () => {
    const row = series("1", { "http.route": "/a" });

    expect(cellValue(row, method)).toBe("");
    expect(seriesLabel(row, [method, route])).toBe("/a");
  });

  test("names a series without attributes", () => {
    expect(seriesLabel(series("1", {}), [])).toBe("no attributes");
  });
});

describe("sortByColumns", () => {
  test("orders series by each column in turn, then by ID", () => {
    const rows = [
      series("4", { method: "POST", "http.route": "/a" }),
      series("3", { method: "GET", "http.route": "/b" }),
      series("2", { method: "GET", "http.route": "/a" }),
      series("1", { method: "GET", "http.route": "/a" }),
    ];
    const columns = attributeColumns(rows);

    expect(columns.map((column) => column.key)).toEqual(["http.route", "method"]);
    expect(sortByColumns(rows, columns).map((row) => row.series_id)).toEqual(["1", "2", "4", "3"]);
  });
});
