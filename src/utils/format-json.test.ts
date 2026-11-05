import { expect, test } from "bun:test";

import { formatJson } from "./format-json.ts";

test("indents objects and arrays", () => {
  expect(formatJson('{"url.path":"/api/cart","http.response.status_code":200}')).toBe(
    '{\n  "url.path": "/api/cart",\n  "http.response.status_code": 200\n}',
  );
  expect(formatJson("[200,503]")).toBe("[\n  200,\n  503\n]");
});

test("keeps scalars and text that isn't JSON as written", () => {
  expect(formatJson("42")).toBe("42");
  expect(formatJson('"OK"')).toBe('"OK"');
  expect(formatJson("null")).toBe("null");
  expect(formatJson("API request completed")).toBe("API request completed");
  expect(formatJson('{"url.path":')).toBe('{"url.path":');
});
