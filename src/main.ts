import { startReceiver } from "./db/receiver.ts";
import { env } from "./env.ts";

const receiver = await startReceiver({
  port: env.OTEL_TUI_PORT,
  retentionMs: env.OTEL_TUI_RETENTION_MINUTES * 60 * 1000,
});
console.log(`Listening for OTLP/HTTP on ${receiver.url}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await receiver.close();
    process.exit(0);
  });
}
