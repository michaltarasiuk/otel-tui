import { MINUTE_MS } from "#utils/time-units.ts";

import { HELP, OptionsError, parseOptions, VERSION } from "./options.ts";
import { startReceiver } from "./receiver/receiver.ts";
import { startTui } from "./tui/tui.tsx";

const USAGE_ERROR_EXIT_CODE = 2;

function command() {
  try {
    return parseOptions(Bun.argv.slice(2), process.env);
  } catch (error) {
    if (error instanceof OptionsError) {
      const lines = error.message.split("\n").map((line) => `otel-tui: ${line}`);
      console.error(`${lines.join("\n")}\n\n${HELP}`);
      process.exit(USAGE_ERROR_EXIT_CODE);
    }
    throw error;
  }
}

const parsed = command();

if (parsed.kind === "help") {
  console.log(HELP);
} else if (parsed.kind === "version") {
  console.log(VERSION);
} else {
  const { options } = parsed;

  await using receiver = await startReceiver({
    httpPort: options.httpPort,
    grpcPort: options.grpcPort,
    retentionMs: options.retentionMinutes * MINUTE_MS,
    memoryLimitBytes: options.memoryLimitMb * 1024 * 1024,
  });
  const connection = await receiver.connect();

  const tui = await startTui({
    connection,
    receiverUrls: receiver.urls,
  });

  await tui.closed;
}
