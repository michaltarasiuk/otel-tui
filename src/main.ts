import dedent from "dedent";

import { MINUTE_MS } from "#utils/time.ts";

import { startMcpServer } from "./mcp/mcp-server.ts";
import { HELP, type Options, OptionsError, parseOptions, VERSION } from "./options.ts";
import { type Receiver, startReceiver } from "./receiver/receiver.ts";
import { StartupError } from "./startup-error.ts";
import { startTui } from "./tui/tui.tsx";

const START_ERROR_EXIT_CODE = 1;
const USAGE_ERROR_EXIT_CODE = 2;

function prefixLines(message: string) {
  return message
    .split("\n")
    .map((line) => `otel-tui: ${line}`)
    .join("\n");
}

function command() {
  try {
    return parseOptions(Bun.argv.slice(2), process.env);
  } catch (error) {
    if (error instanceof OptionsError) {
      console.error(`${prefixLines(error.message)}\n\n${HELP}`);
      process.exit(USAGE_ERROR_EXIT_CODE);
    }
    throw error;
  }
}

async function receive(options: Options) {
  try {
    return await startReceiver({
      host: options.host,
      httpPort: options.httpPort,
      grpcPort: options.grpcPort,
      retentionMs: options.retentionMinutes * MINUTE_MS,
      memoryLimitBytes: options.memoryLimitMb * 1024 * 1024,
    });
  } catch (error) {
    if (error instanceof StartupError) {
      console.error(prefixLines(error.message));
      process.exit(START_ERROR_EXIT_CODE);
    }
    throw error;
  }
}

async function serveMcp(receiver: Receiver, port: number) {
  const connection = await receiver.connect();
  try {
    return startMcpServer({ connection, port, version: VERSION });
  } catch (error) {
    if (error instanceof StartupError) {
      console.error(prefixLines(error.message));
      await receiver[Symbol.asyncDispose]();
      process.exit(START_ERROR_EXIT_CODE);
    }
    throw error;
  }
}

function stopSignal() {
  return new Promise<void>((resolve) => {
    process.once("SIGINT", () => resolve());
    process.once("SIGTERM", () => resolve());
  });
}

const parsed = command();

if (parsed.kind === "help") {
  console.log(HELP);
} else if (parsed.kind === "version") {
  console.log(VERSION);
} else {
  const { options } = parsed;

  await using receiver = await receive(options);
  await using mcp = options.mcp ? await serveMcp(receiver, options.mcpPort) : undefined;

  if (options.headless) {
    console.log(dedent`
      otel-tui ${VERSION} is receiving OTLP/HTTP on ${receiver.httpUrl} and OTLP/gRPC on ${receiver.grpcUrl}
      ${mcp === undefined ? "MCP is off; --mcp serves it" : `MCP: ${mcp.url}`}
      Press ctrl+c to stop.
    `);
    await stopSignal();
  } else {
    const tui = await startTui({
      connection: await receiver.connect(),
      httpUrl: receiver.httpUrl,
      grpcUrl: receiver.grpcUrl,
      mcpUrl: mcp?.url,
      onClear: () => receiver.clear(),
    });
    await tui.closed;
  }
}
