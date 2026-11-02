import { connect, type IncomingHttpHeaders } from "node:http2";

import { startReceiver } from "../db/receiver.ts";
import { MILLISECONDS_PER_HOUR } from "../utils/time-units.ts";

const GRPC_UNCOMPRESSED_FLAG = 0;
const GRPC_ZERO_MESSAGE_LENGTH = [0, 0, 0, 0];
const emptyGrpcMessageFrame = new Uint8Array([GRPC_UNCOMPRESSED_FLAG, ...GRPC_ZERO_MESSAGE_LENGTH]);
const GRPC_STATUS_OK = "0";

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
  retentionMs = MILLISECONDS_PER_HOUR,
}: TestReceiverOptions = {}) {
  const receiver = await startReceiver({
    httpPort: freePort(),
    grpcPort: freePort(),
    retentionMs,
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

  async function sendGrpc(method: string) {
    const session = connect(receiver.urls.grpc);
    try {
      const status = await new Promise((resolve, reject) => {
        function resolveStatus(headers: IncomingHttpHeaders) {
          const status = headers["grpc-status"];
          if (status !== undefined) {
            resolve(status);
          }
        }
        session.on("error", (error) => reject(error));
        session
          .request({
            ":method": "POST",
            ":path": method,
            "content-type": "application/grpc",
          })
          .on("response", (headers) => resolveStatus(headers))
          .on("trailers", (trailers) => resolveStatus(trailers))
          .on("error", (error) => reject(error))
          .end(emptyGrpcMessageFrame);
      });
      if (status !== GRPC_STATUS_OK) {
        throw new Error(`gRPC ${method} failed with status ${status}`);
      }
    } finally {
      session.close();
    }
    await flush();
  }

  return {
    urls: receiver.urls,
    connect: () => receiver.connect(),
    sendHttp,
    sendGrpc,
    [Symbol.asyncDispose]: () => receiver[Symbol.asyncDispose](),
  };
}

export type TestReceiver = Awaited<ReturnType<typeof startTestReceiver>>;
