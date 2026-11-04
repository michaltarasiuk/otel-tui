import { startReceiver } from "./db/receiver.ts";
import { env } from "./env.ts";
import { startTui } from "./tui/tui.tsx";

await using receiver = await startReceiver({
  httpPort: env.OTEL_TUI_HTTP_PORT,
  grpcPort: env.OTEL_TUI_GRPC_PORT,
  retentionMs: env.OTEL_TUI_RETENTION_MINUTES * 60 * 1000,
});
const connection = await receiver.connect();

const tui = await startTui({
  connection,
  receiverUrls: receiver.urls,
});

await tui.closed;
