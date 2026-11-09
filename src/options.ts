import { parseArgs } from "node:util";

import dedent from "dedent";
import { z } from "zod";

import { LOOPBACK_HOST } from "#utils/loopback.ts";

import packageJson from "../package.json" with { type: "json" };

function port(name: string) {
  const error = `${name} must be a whole number from 1 to 65535`;
  return z.coerce.number({ error }).int({ error }).min(1, { error }).max(65_535, { error });
}

function positive(name: string) {
  const error = `${name} must be a number above 0`;
  return z.coerce.number({ error }).positive({ error });
}

function host(name: string) {
  return z.union([z.ipv4(), z.hostname()], {
    error: `${name} must be an IPv4 address or a hostname`,
  });
}

function toggle(name: string) {
  return z.union([z.boolean(), z.stringbool()], { error: `${name} must be true or false` });
}

const Options = z.object({
  host: host("--host (OTEL_TUI_HOST)").default(LOOPBACK_HOST),
  httpPort: port("--http-port (OTEL_TUI_HTTP_PORT)").default(4318),
  grpcPort: port("--grpc-port (OTEL_TUI_GRPC_PORT)").default(4317),
  retentionMinutes: positive("--retention (OTEL_TUI_RETENTION_MINUTES)").default(60),
  memoryLimitMb: positive("--memory-limit (OTEL_TUI_MEMORY_LIMIT_MB)").default(1024),
  mcp: toggle("--mcp (OTEL_TUI_MCP)").default(false),
  mcpPort: port("--mcp-port (OTEL_TUI_MCP_PORT)").default(4320),
  headless: toggle("--headless (OTEL_TUI_HEADLESS)").default(false),
});
export type Options = z.infer<typeof Options>;

export const VERSION = packageJson.version;

export const HELP = dedent`
  Usage: otel-tui [options]

  A terminal app for viewing OpenTelemetry traces, metrics, and logs.

  Options:
    --host <address>        Address OTLP listens on (default ${LOOPBACK_HOST}, env OTEL_TUI_HOST)
    --http-port <port>      Port for OTLP/HTTP (default 4318, env OTEL_TUI_HTTP_PORT)
    --grpc-port <port>      Port for OTLP/gRPC (default 4317, env OTEL_TUI_GRPC_PORT)
    --retention <minutes>   How long telemetry is kept (default 60, env OTEL_TUI_RETENTION_MINUTES)
    --memory-limit <MiB>    Memory for telemetry (default 1024, env OTEL_TUI_MEMORY_LIMIT_MB)
    --mcp                   Serve MCP tools that read telemetry on ${LOOPBACK_HOST} (env OTEL_TUI_MCP)
    --mcp-port <port>       Port for MCP (default 4320, env OTEL_TUI_MCP_PORT)
    --headless              Run without the terminal UI (env OTEL_TUI_HEADLESS)
    -h, --help              Show this help
    -v, --version           Show the version
`;

export class OptionsError extends Error {}

type Command = { kind: "help" } | { kind: "version" } | { kind: "run"; options: Options };

function readArgs(args: string[]) {
  try {
    return parseArgs({
      args,
      options: {
        host: { type: "string" },
        "http-port": { type: "string" },
        "grpc-port": { type: "string" },
        retention: { type: "string" },
        "memory-limit": { type: "string" },
        mcp: { type: "boolean" },
        "mcp-port": { type: "string" },
        headless: { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    }).values;
  } catch (error) {
    throw new OptionsError(error instanceof Error ? error.message : String(error));
  }
}

export function parseOptions(args: string[], env: Record<string, string | undefined>): Command {
  const values = readArgs(args);

  if (values.help === true) {
    return { kind: "help" };
  }
  if (values.version === true) {
    return { kind: "version" };
  }

  const options = Options.safeParse({
    host: values.host ?? env["OTEL_TUI_HOST"],
    httpPort: values["http-port"] ?? env["OTEL_TUI_HTTP_PORT"],
    grpcPort: values["grpc-port"] ?? env["OTEL_TUI_GRPC_PORT"],
    retentionMinutes: values.retention ?? env["OTEL_TUI_RETENTION_MINUTES"],
    memoryLimitMb: values["memory-limit"] ?? env["OTEL_TUI_MEMORY_LIMIT_MB"],
    mcp: values.mcp ?? env["OTEL_TUI_MCP"],
    mcpPort: values["mcp-port"] ?? env["OTEL_TUI_MCP_PORT"],
    headless: values.headless ?? env["OTEL_TUI_HEADLESS"],
  });
  if (!options.success) {
    throw new OptionsError(options.error.issues.map((issue) => issue.message).join("\n"));
  }
  return { kind: "run", options: options.data };
}
