import { expect, test } from "bun:test";

import { type Options, OptionsError, parseOptions } from "./options.ts";

const DEFAULTS: Options = {
  host: "127.0.0.1",
  httpPort: 4318,
  grpcPort: 4317,
  retentionMinutes: 60,
  memoryLimitMb: 1024,
  mcp: false,
  mcpPort: 4320,
  headless: false,
};

function run(options: Partial<Options> = {}) {
  return { kind: "run" as const, options: { ...DEFAULTS, ...options } };
}

test("uses the defaults without flags or environment", () => {
  expect(parseOptions([], {})).toEqual(run());
});

test("reads each option from its flag", () => {
  const args = [
    "--host",
    "0.0.0.0",
    "--http-port",
    "9001",
    "--grpc-port",
    "9002",
    "--retention",
    "5",
    "--memory-limit=256",
    "--mcp",
    "--mcp-port",
    "9003",
    "--headless",
  ];

  expect(parseOptions(args, {})).toEqual(
    run({
      host: "0.0.0.0",
      httpPort: 9001,
      grpcPort: 9002,
      retentionMinutes: 5,
      memoryLimitMb: 256,
      mcp: true,
      mcpPort: 9003,
      headless: true,
    }),
  );
});

test("reads each option from the environment", () => {
  const env = {
    OTEL_TUI_HOST: "localhost",
    OTEL_TUI_HTTP_PORT: "9001",
    OTEL_TUI_GRPC_PORT: "9002",
    OTEL_TUI_RETENTION_MINUTES: "5",
    OTEL_TUI_MEMORY_LIMIT_MB: "256",
    OTEL_TUI_MCP: "true",
    OTEL_TUI_MCP_PORT: "9003",
    OTEL_TUI_HEADLESS: "1",
  };

  expect(parseOptions([], env)).toEqual(
    run({
      host: "localhost",
      httpPort: 9001,
      grpcPort: 9002,
      retentionMinutes: 5,
      memoryLimitMb: 256,
      mcp: true,
      mcpPort: 9003,
      headless: true,
    }),
  );
});

test("prefers flags over the environment", () => {
  expect(parseOptions(["--http-port", "9000"], { OTEL_TUI_HTTP_PORT: "14318" })).toEqual(
    run({ httpPort: 9000 }),
  );
});

test("asks for help or the version", () => {
  expect(parseOptions(["--help"], {})).toEqual({ kind: "help" });
  expect(parseOptions(["-h"], {})).toEqual({ kind: "help" });
  expect(parseOptions(["--version"], {})).toEqual({ kind: "version" });
  expect(parseOptions(["-v"], {})).toEqual({ kind: "version" });
});

test("names each invalid option with its flag and variable", () => {
  const args = ["--host", "not a host", "--http-port", "nope", "--retention", "0"];
  const env = { OTEL_TUI_GRPC_PORT: "70000", OTEL_TUI_MCP: "maybe" };
  const error = new OptionsError(
    [
      "--host (OTEL_TUI_HOST) must be an IPv4 address or a hostname",
      "--http-port (OTEL_TUI_HTTP_PORT) must be a whole number from 1 to 65535",
      "--grpc-port (OTEL_TUI_GRPC_PORT) must be a whole number from 1 to 65535",
      "--retention (OTEL_TUI_RETENTION_MINUTES) must be a number above 0",
      "--mcp (OTEL_TUI_MCP) must be true or false",
    ].join("\n"),
  );

  expect(() => parseOptions(args, env)).toThrow(error);
});

test("rejects unknown options", () => {
  expect(() => parseOptions(["--bogus"], {})).toThrow(OptionsError);
});
