import type { DuckDBConnection } from "@duckdb/node-api";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import dedent from "dedent";

import { StartupError } from "../startup-error.ts";
import { registerTools } from "./tools.ts";

const HOST = "127.0.0.1";

interface McpServerOptions {
  connection: DuckDBConnection;
  port: number;
  version: string;
}

export function startMcpServer({ connection, port, version }: McpServerOptions) {
  const allowedHosts = [`${HOST}:${port}`, `localhost:${port}`];

  async function respond(request: Request) {
    const server = new McpServer({ name: "otel-tui", version });
    registerTools(server, connection);
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: true,
      enableDnsRebindingProtection: true,
      allowedHosts,
      allowedOrigins: allowedHosts.map((host) => `http://${host}`),
    });
    await server.connect(transport);
    try {
      return await transport.handleRequest(request);
    } finally {
      await server.close();
    }
  }

  try {
    const httpServer = Bun.serve({
      hostname: HOST,
      port,
      routes: { "/mcp": (request) => respond(request) },
      fetch: () => new Response("Not found", { status: 404 }),
    });
    return {
      url: `http://${HOST}:${port}/mcp`,
      [Symbol.asyncDispose]: () => httpServer.stop(true),
    };
  } catch (error) {
    throw new StartupError(
      dedent`
        couldn't serve MCP on ${HOST}:${port}; pick another port with --mcp-port
        ${error instanceof Error ? error.message : String(error)}
      `,
      { cause: error },
    );
  }
}
