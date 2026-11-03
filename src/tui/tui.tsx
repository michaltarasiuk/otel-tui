import type { DuckDBConnection } from "@duckdb/node-api";
import { type CliRendererConfig, createCliRenderer } from "@opentui/core";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider } from "@opentui/keymap/react";
import { createRoot } from "@opentui/react";
import {
  environmentManager,
  QueryClient,
  type QueryClientConfig,
  QueryClientProvider,
} from "@tanstack/react-query";

import type { ReceiverUrls } from "../db/receiver.ts";
import { App } from "./app.tsx";
import { ConnectionContext } from "./connection.ts";
import { NavigationProvider } from "./navigation.tsx";

const FOCUS_CONTROLLED_BY_APP = true;

export const RENDERER_CONFIG = {
  autoFocus: !FOCUS_CONTROLLED_BY_APP,
} satisfies CliRendererConfig;

export const QUERY_CLIENT_CONFIG = {
  defaultOptions: {
    queries: { retry: false },
  },
} satisfies QueryClientConfig;

function enableRefetchWithoutWindow() {
  environmentManager.setIsServer(() => false);
}

enableRefetchWithoutWindow();

export async function waitForInFlightQueries(queryClient: QueryClient) {
  const promises = queryClient
    .getQueryCache()
    .findAll({ fetchStatus: "fetching" })
    .map((query) => query.promise)
    .filter((promise) => promise !== undefined);
  await Promise.allSettled(promises);
}

interface TuiRootProps {
  queryClient: QueryClient;
  connection: DuckDBConnection;
  receiverUrls: ReceiverUrls;
}

export function TuiRoot({ queryClient, connection, receiverUrls }: TuiRootProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionContext value={connection}>
        <NavigationProvider>
          <App receiverUrls={receiverUrls} />
        </NavigationProvider>
      </ConnectionContext>
    </QueryClientProvider>
  );
}

interface TuiOptions {
  connection: DuckDBConnection;
  receiverUrls: ReceiverUrls;
}

export async function startTui({ connection, receiverUrls }: TuiOptions) {
  const renderer = await createCliRenderer(RENDERER_CONFIG);
  const keymap = createDefaultOpenTuiKeymap(renderer);

  const queryClient = new QueryClient(QUERY_CLIENT_CONFIG);

  renderer.keyInput.on("keypress", (key) => {
    if (key.name === "`" && renderer.currentFocusedEditor === null) {
      renderer.console.toggle();
    }
  });

  createRoot(renderer).render(
    <KeymapProvider keymap={keymap}>
      <TuiRoot queryClient={queryClient} connection={connection} receiverUrls={receiverUrls} />
    </KeymapProvider>,
  );

  return {
    closed: renderer.closed
      .then(() => waitForInFlightQueries(queryClient))
      .then(() => queryClient.clear()),
  };
}
