import { expect, test } from "bun:test";

import { collapseWhitespace, compareText, formatJson } from "./text.ts";

test("collapseWhitespace joins lines and runs of spaces into one line", () => {
  const error =
    "<_InactiveRpcError of RPC that terminated with:\n" +
    "\tstatus = StatusCode.INTERNAL\r\n" +
    '\tdetails = "Product Catalog Fail Feature Flag Enabled">';

  expect(collapseWhitespace("GET    /api/cart")).toBe("GET /api/cart");
  expect(collapseWhitespace(error)).toBe(
    "<_InactiveRpcError of RPC that terminated with: " +
      "status = StatusCode.INTERNAL " +
      'details = "Product Catalog Fail Feature Flag Enabled">',
  );
});

test("collapseWhitespace trims the ends", () => {
  expect(collapseWhitespace("  GET /api/cart \n")).toBe("GET /api/cart");
  expect(collapseWhitespace(" \n ")).toBe("");
});

test("compareText orders numbers inside text by their value", () => {
  expect(compareText("2", "10")).toBeLessThan(0);
  expect(compareText("pod-10", "pod-9")).toBeGreaterThan(0);
  expect(compareText("SPAN_KIND_SERVER", "SPAN_KIND_CLIENT")).toBeGreaterThan(0);
  expect(compareText("cart", "cart")).toBe(0);
});

test("formatJson indents objects and arrays", () => {
  expect(formatJson('{"url.path":"/api/cart","http.response.status_code":200}')).toBe(
    '{\n  "url.path": "/api/cart",\n  "http.response.status_code": 200\n}',
  );
  expect(formatJson("[200,503]")).toBe("[\n  200,\n  503\n]");
});

test("formatJson keeps scalars and text that isn't JSON as written", () => {
  expect(formatJson("1.0")).toBe("1.0");
  expect(formatJson('"OK"')).toBe('"OK"');
  expect(formatJson("null")).toBe("null");
  expect(formatJson("API request completed")).toBe("API request completed");
  expect(formatJson('{"url.path":')).toBe('{"url.path":');
});
