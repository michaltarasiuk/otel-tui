import { startReceiver } from "#receiver/receiver.ts";
import { LOOPBACK_HOST } from "#utils/loopback.ts";

import { freePortPair } from "./free-port.ts";

interface TestReceiverOptions {
  retentionMs?: number;
  memoryLimitBytes?: number;
}

export async function startTestReceiver({
  retentionMs = 60 * 60 * 1000,
  memoryLimitBytes = 1024 * 1024 * 1024,
}: TestReceiverOptions = {}) {
  const [httpPort, grpcPort] = freePortPair();
  const receiver = await startReceiver({
    host: LOOPBACK_HOST,
    httpPort,
    grpcPort,
    retentionMs,
    memoryLimitBytes,
  });
  const connection = await receiver.connect();
  const uri = `otlp:${new URL(receiver.httpUrl).host}`;

  function flush() {
    return connection.run("SELECT * FROM otlp_flush($uri)", { uri });
  }

  async function sendHttp(path: string, request: unknown) {
    const response = await fetch(new URL(path, receiver.httpUrl), {
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
    httpUrl: receiver.httpUrl,
    grpcUrl: receiver.grpcUrl,
    connect: () => receiver.connect(),
    clear: () => receiver.clear(),
    sendHttp,
    [Symbol.asyncDispose]: () => receiver[Symbol.asyncDispose](),
  };
}
export type TestReceiver = Awaited<ReturnType<typeof startTestReceiver>>;
