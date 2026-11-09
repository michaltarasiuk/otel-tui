import { expect, test } from "bun:test";

import { OptionsError, parseOptions } from "./options.ts";

const DEFAULTS = { httpPort: 4318, grpcPort: 4317, retentionMinutes: 60, memoryLimitMb: 1024 };

test("uses the defaults without flags or environment", () => {
  expect(parseOptions([], {})).toEqual({ kind: "run", options: DEFAULTS });
});

test("reads the environment", () => {
  expect(
    parseOptions([], { OTEL_TUI_HTTP_PORT: "14318", OTEL_TUI_RETENTION_MINUTES: "5" }),
  ).toEqual({ kind: "run", options: { ...DEFAULTS, httpPort: 14318, retentionMinutes: 5 } });
});

test("prefers flags over the environment", () => {
  expect(
    parseOptions(["--http-port", "9000", "--memory-limit=256"], { OTEL_TUI_HTTP_PORT: "14318" }),
  ).toEqual({ kind: "run", options: { ...DEFAULTS, httpPort: 9000, memoryLimitMb: 256 } });
});

test("asks for help or the version", () => {
  expect(parseOptions(["--help"], {})).toEqual({ kind: "help" });
  expect(parseOptions(["-h"], {})).toEqual({ kind: "help" });
  expect(parseOptions(["--version"], {})).toEqual({ kind: "version" });
  expect(parseOptions(["-v"], {})).toEqual({ kind: "version" });
});

test("names each invalid option with its flag and variable", () => {
  expect(() => parseOptions(["--http-port", "nope", "--retention", "0"], {})).toThrow(
    new OptionsError(
      "--http-port (OTEL_TUI_HTTP_PORT) must be a whole number from 1 to 65535\n" +
        "--retention (OTEL_TUI_RETENTION_MINUTES) must be a number above 0",
    ),
  );
  expect(() => parseOptions([], { OTEL_TUI_GRPC_PORT: "70000" })).toThrow(
    "--grpc-port (OTEL_TUI_GRPC_PORT) must be a whole number from 1 to 65535",
  );
});

test("rejects unknown options", () => {
  expect(() => parseOptions(["--bogus"], {})).toThrow(OptionsError);
});
