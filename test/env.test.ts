import { expect, test } from "bun:test";
import { parseEnv } from "../src/env.ts";

test("defaults the port to 4318", () => {
  expect(parseEnv({}).OTEL_TUI_PORT).toBe(4318);
});

test("coerces the port from a string", () => {
  expect(parseEnv({ OTEL_TUI_PORT: "4319" }).OTEL_TUI_PORT).toBe(4319);
});

test.each(["abc", "0", "70000", "1.5"])("rejects port %p", (port) => {
  expect(() => parseEnv({ OTEL_TUI_PORT: port })).toThrow();
});
