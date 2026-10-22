import { startReceiver } from "./db/receiver.ts";
import { env } from "./env.ts";
import { startTui } from "./tui/tui.tsx";

await using receiver = await startReceiver({
  port: env.OTEL_TUI_PORT,
  retentionMs: env.OTEL_TUI_RETENTION_MINUTES * 60 * 1000,
});
const connection = await receiver.connect();

const tui = await startTui({
  connection,
  receiverUrl: receiver.url,
});

await tui.closed;
