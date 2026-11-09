import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

import { startMcpServer } from "#mcp/mcp-server.ts";

import { freePort } from "./free-port.ts";
import type { TestReceiver } from "./receiver.ts";

const VERSION = "0.0.0";

export async function startTestMcp(receiver: TestReceiver) {
  const connection = await receiver.connect();
  const server = startMcpServer({ connection, port: freePort(), version: VERSION });

  const client = new Client({ name: "test", version: VERSION });
  await client.connect(new StreamableHTTPClientTransport(new URL(server.url)));

  async function callText(name: string, args: Record<string, unknown> = {}) {
    const result = await client.callTool({ name, arguments: args });
    const { content } = CallToolResultSchema.parse(result);
    return content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");
  }

  async function callJson(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    return JSON.parse(await callText(name, args));
  }

  return {
    url: server.url,
    client,
    callText,
    callJson,
    async [Symbol.asyncDispose]() {
      await client.close();
      await server[Symbol.asyncDispose]();
    },
  };
}
export type TestMcp = Awaited<ReturnType<typeof startTestMcp>>;
