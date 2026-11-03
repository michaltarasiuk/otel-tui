import { describe, expect, test } from "bun:test";

import { collapseWhitespace, formatCount, formatShownCount, prettyPrintJson } from "./text.ts";

describe("formatCount", () => {
  test("uses the singular noun for one", () => {
    expect(formatCount(1, "span")).toBe("1 span");
  });

  test("uses the plural noun for any other count", () => {
    expect(formatCount(0, "span")).toBe("0 spans");
    expect(formatCount(3, "span")).toBe("3 spans");
  });

  test("groups thousands", () => {
    expect(formatCount(12_345, "span")).toBe("12,345 spans");
  });
});

describe("formatShownCount", () => {
  test("shows only the total when everything is shown", () => {
    expect(formatShownCount(3, 3, "log")).toBe("3 logs");
    expect(formatShownCount(1, 1, "log")).toBe("1 log");
  });

  test("shows how many of the total are shown", () => {
    expect(formatShownCount(2, 1_500, "log")).toBe("2 of 1,500 logs");
  });
});

describe("collapseWhitespace", () => {
  test("collapses runs of whitespace into one space", () => {
    expect(collapseWhitespace("GET    /api/cart")).toBe("GET /api/cart");
  });

  test("joins lines and tabs into a single line", () => {
    expect(
      collapseWhitespace(
        '<_InactiveRpcError of RPC that terminated with:\n\tstatus = StatusCode.INTERNAL\r\n\tdetails = "Product Catalog Fail Feature Flag Enabled">',
      ),
    ).toBe(
      '<_InactiveRpcError of RPC that terminated with: status = StatusCode.INTERNAL details = "Product Catalog Fail Feature Flag Enabled">',
    );
  });

  test("trims leading and trailing whitespace", () => {
    expect(collapseWhitespace("  GET /api/cart \n")).toBe("GET /api/cart");
    expect(collapseWhitespace(" \n ")).toBe("");
  });
});

describe("prettyPrintJson", () => {
  test("indents a JSON object or array", () => {
    expect(prettyPrintJson('{"url.path":"/api/cart","http.response.status_code":200}')).toBe(
      '{\n  "url.path": "/api/cart",\n  "http.response.status_code": 200\n}',
    );
    expect(prettyPrintJson("[200,503]")).toBe("[\n  200,\n  503\n]");
  });

  test("keeps a JSON scalar as written", () => {
    expect(prettyPrintJson("42")).toBe("42");
    expect(prettyPrintJson('"OK"')).toBe('"OK"');
    expect(prettyPrintJson("null")).toBe("null");
  });

  test("keeps text that isn't JSON", () => {
    expect(prettyPrintJson("API request completed")).toBe("API request completed");
    expect(prettyPrintJson('{"url.path":')).toBe('{"url.path":');
  });
});
