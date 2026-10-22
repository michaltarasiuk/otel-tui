import { startReceiver } from "./db/receiver.ts";
import { env } from "./env.ts";
import { startTui } from "./tui/tui.tsx";

await using receiver = await startReceiver({
  port: env.OTEL_TUI_PORT,
  retentionMs: env.OTEL_TUI_RETENTION_MINUTES * 60 * 1000,
});
using connection = await receiver.connect();

const tui = await startTui({
  receiver: {
    url: receiver.url,
    connection,
  },
});
await tui.renderer.closed;
