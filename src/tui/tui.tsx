import type { DuckDBConnection } from "@duckdb/node-api";
import {
  type CliRendererConfig,
  createClipboard,
  createCliRenderer,
  createHostClipboard,
  createRendererClipboardAdapter,
} from "@opentui/core";
import {
  registerDeadBindingWarnings,
  registerUnresolvedCommandWarnings,
} from "@opentui/keymap/addons";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider } from "@opentui/keymap/react";
import { createRoot } from "@opentui/react";
import {
  environmentManager,
  QueryCache,
  QueryClient,
  type QueryClientConfig,
  QueryClientProvider,
} from "@tanstack/react-query";
import { StrictMode } from "react";

import type { ReceiverUrls } from "#receiver/receiver.ts";

import { App } from "./app.tsx";
import { ClipboardContext } from "./clipboard.tsx";
import { ConnectionContext } from "./query/connection.ts";

const FOCUS_CONTROLLED_BY_APP = true;

export const RENDERER_CONFIG = { autoFocus: !FOCUS_CONTROLLED_BY_APP } satisfies CliRendererConfig;

export const QUERY_CLIENT_CONFIG = {
  defaultOptions: { queries: { retry: false } },
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

interface QueryProviderProps {
  queryClient: QueryClient;
  connection: DuckDBConnection;
  children: React.ReactNode;
}

export function QueryProvider({ queryClient, connection, children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionContext value={connection}>{children}</ConnectionContext>
    </QueryClientProvider>
  );
}

interface TuiOptions {
  connection: DuckDBConnection;
  receiverUrls: ReceiverUrls;
  mcpUrl: string | undefined;
  onClear: () => Promise<void>;
}

export async function startTui({ connection, receiverUrls, mcpUrl, onClear }: TuiOptions) {
  const renderer = await createCliRenderer(RENDERER_CONFIG);

  const keymap = createDefaultOpenTuiKeymap(renderer);
  registerDeadBindingWarnings(keymap);
  registerUnresolvedCommandWarnings(keymap);
  keymap.on("warning", ({ message }) => console.warn(message));
  keymap.on("error", ({ message }) => console.error(message));

  const queryClient = new QueryClient({
    ...QUERY_CLIENT_CONFIG,
    queryCache: new QueryCache({
      onError: (error, query) =>
        console.error(`Query ${JSON.stringify(query.queryKey)} failed`, error),
    }),
  });

  renderer.keyInput.on("keypress", (key) => {
    if (key.name === "`" && renderer.currentFocusedEditor === null) {
      renderer.console.toggle();
    }
  });

  const clipboard = createClipboard({
    host: createHostClipboard(),
    terminal: createRendererClipboardAdapter(renderer),
  });

  async function copy(text: string) {
    const { host, terminal } = await clipboard.writeText(text, { destination: "best-available" });
    if (host.status === "failed") {
      console.error("Copying to the host clipboard failed", host.error);
    }
    return host.status === "written" || terminal.status === "attempted";
  }

  createRoot(renderer).render(
    <StrictMode>
      <KeymapProvider keymap={keymap}>
        <QueryProvider queryClient={queryClient} connection={connection}>
          <ClipboardContext value={(text) => copy(text)}>
            <App receiverUrls={receiverUrls} mcpUrl={mcpUrl} onClear={onClear} />
          </ClipboardContext>
        </QueryProvider>
      </KeymapProvider>
    </StrictMode>,
  );

  return {
    closed: renderer.closed
      .then(() => clipboard.dispose())
      .then(() => waitForInFlightQueries(queryClient))
      .then(() => queryClient.clear()),
  };
}
