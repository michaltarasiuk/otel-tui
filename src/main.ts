import { MINUTE_MS } from "#utils/time-units.ts";

import { HELP, type Options, OptionsError, parseOptions, VERSION } from "./options.ts";
import { ReceiverError, startReceiver } from "./receiver/receiver.ts";
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
    if (error instanceof ReceiverError) {
      console.error(prefixLines(error.message));
      process.exit(START_ERROR_EXIT_CODE);
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

  await using receiver = await receive(options);
  const connection = await receiver.connect();

  const tui = await startTui({
    connection,
    receiverUrls: receiver.urls,
    onClear: () => receiver.clear(),
  });

  await tui.closed;
}
