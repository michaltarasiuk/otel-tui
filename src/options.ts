import { parseArgs } from "node:util";

import { z } from "zod";

import packageJson from "../package.json" with { type: "json" };

const PORT_MESSAGE = "must be a whole number from 1 to 65535";
const POSITIVE_MESSAGE = "must be a number above 0";
const HOST_MESSAGE = "must be an IPv4 address or a hostname";

const Port = z.coerce
  .number({ error: PORT_MESSAGE })
  .int({ error: PORT_MESSAGE })
  .min(1, { error: PORT_MESSAGE })
  .max(65_535, { error: PORT_MESSAGE });
const Host = z.union([z.ipv4(), z.hostname()], { error: HOST_MESSAGE });
const Positive = z.coerce.number({ error: POSITIVE_MESSAGE }).positive({ error: POSITIVE_MESSAGE });

const Options = z.object({
  host: Host.default("127.0.0.1"),
  httpPort: Port.default(4318),
  grpcPort: Port.default(4317),
  retentionMinutes: Positive.default(60),
  memoryLimitMb: Positive.default(1024),
});

const NAMES = {
  host: "--host (OTEL_TUI_HOST)",
  httpPort: "--http-port (OTEL_TUI_HTTP_PORT)",
  grpcPort: "--grpc-port (OTEL_TUI_GRPC_PORT)",
  retentionMinutes: "--retention (OTEL_TUI_RETENTION_MINUTES)",
  memoryLimitMb: "--memory-limit (OTEL_TUI_MEMORY_LIMIT_MB)",
} satisfies Record<keyof z.infer<typeof Options>, string>;
export type Options = z.infer<typeof Options>;

export const VERSION = packageJson.version;

export const HELP = `Usage: otel-tui [options]

A terminal app for viewing OpenTelemetry traces, metrics, and logs.

Options:
  --host <address>        Address to listen on (default 127.0.0.1, env OTEL_TUI_HOST)
  --http-port <port>      Port for OTLP/HTTP (default 4318, env OTEL_TUI_HTTP_PORT)
  --grpc-port <port>      Port for OTLP/gRPC (default 4317, env OTEL_TUI_GRPC_PORT)
  --retention <minutes>   How long telemetry is kept (default 60, env OTEL_TUI_RETENTION_MINUTES)
  --memory-limit <MiB>    Memory for telemetry (default 1024, env OTEL_TUI_MEMORY_LIMIT_MB)
  -h, --help              Show this help
  -v, --version           Show the version`;

export class OptionsError extends Error {}

type Command = { kind: "help" } | { kind: "version" } | { kind: "run"; options: Options };

export function parseOptions(args: string[], env: Record<string, string | undefined>): Command {
  let values;
  try {
    ({ values } = parseArgs({
      args,
      options: {
        host: { type: "string" },
        "http-port": { type: "string" },
        "grpc-port": { type: "string" },
        retention: { type: "string" },
        "memory-limit": { type: "string" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    }));
  } catch (error) {
    throw new OptionsError(error instanceof Error ? error.message : String(error));
  }

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
  });
  if (!options.success) {
    const messages = options.error.issues.map(
      ({ path, message }) => `${NAMES[path[0] as keyof typeof NAMES]} ${message}`,
    );
    throw new OptionsError(messages.join("\n"));
  }
  return { kind: "run", options: options.data };
}
