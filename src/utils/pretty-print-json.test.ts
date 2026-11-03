import { expect, test } from "bun:test";

import { prettyPrintJson } from "./pretty-print-json.ts";

test("indents a JSON object or array", () => {
  expect(prettyPrintJson('{"path":"/cart","status":200}')).toBe(
    '{\n  "path": "/cart",\n  "status": 200\n}',
  );
  expect(prettyPrintJson("[1,2]")).toBe("[\n  1,\n  2\n]");
});

test("keeps a JSON scalar as written", () => {
  expect(prettyPrintJson("42")).toBe("42");
  expect(prettyPrintJson('"done"')).toBe('"done"');
  expect(prettyPrintJson("null")).toBe("null");
});

test("keeps text that isn't JSON", () => {
  expect(prettyPrintJson("order placed")).toBe("order placed");
  expect(prettyPrintJson('{"path":')).toBe('{"path":');
});
