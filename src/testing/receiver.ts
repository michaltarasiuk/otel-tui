import { startReceiver } from "#receiver/receiver.ts";

function freePort() {
  using listener = Bun.listen({
    hostname: "127.0.0.1",
    port: 0,
    socket: { data() {} },
  });
  return listener.port;
}

interface TestReceiverOptions {
  retentionMs?: number;
  memoryLimitBytes?: number;
}

export async function startTestReceiver({
  retentionMs = 60 * 60 * 1000,
  memoryLimitBytes = 1024 * 1024 * 1024,
}: TestReceiverOptions = {}) {
  const receiver = await startReceiver({
    httpPort: freePort(),
    grpcPort: freePort(),
    retentionMs,
    memoryLimitBytes,
  });
  const connection = await receiver.connect();
  const uri = `otlp:${new URL(receiver.urls.http).host}`;

  function flush() {
    return connection.run("SELECT * FROM otlp_flush($uri)", { uri });
  }

  async function sendHttp(path: string, request: unknown) {
    const response = await fetch(new URL(path, receiver.urls.http), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`POST ${path} failed with ${response.status}: ${await response.text()}`);
    }
    await flush();
  }

  return {
    urls: receiver.urls,
    connect: () => receiver.connect(),
    sendHttp,
    [Symbol.asyncDispose]: () => receiver[Symbol.asyncDispose](),
  };
}

export type TestReceiver = Awaited<ReturnType<typeof startTestReceiver>>;
