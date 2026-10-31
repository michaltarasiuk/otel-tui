import { startReceiver } from "../db/receiver.ts";
import { MILLISECONDS_PER_HOUR } from "../utils/time-units.ts";

const DEFAULT_RETENTION_MS = MILLISECONDS_PER_HOUR;

function freePort() {
  const listener = Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } });
  const { port } = listener;
  listener.stop(true);
  return port;
}

interface TestReceiverOptions {
  retentionMs?: number;
}

export async function startTestReceiver({
  retentionMs = DEFAULT_RETENTION_MS,
}: TestReceiverOptions = {}) {
  const receiver = await startReceiver({
    httpPort: freePort(),
    grpcPort: freePort(),
    retentionMs,
  });
  const connection = await receiver.connect();
  const uri = `otlp:${new URL(receiver.urls.http).host}`;

  async function send(path: string, request: unknown) {
    const response = await fetch(new URL(path, receiver.urls.http), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`POST ${path} failed with ${response.status}: ${await response.text()}`);
    }
    await connection.run("SELECT * FROM otlp_flush($uri)", { uri });
  }

  return {
    urls: receiver.urls,
    connect: () => receiver.connect(),
    send,
    [Symbol.asyncDispose]: () => receiver[Symbol.asyncDispose](),
  };
}

export type TestReceiver = Awaited<ReturnType<typeof startTestReceiver>>;
