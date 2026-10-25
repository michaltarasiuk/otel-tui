import type { DuckDBConnection } from "@duckdb/node-api";
import { createCliRenderer } from "@opentui/core";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider } from "@opentui/keymap/react";
import { createRoot } from "@opentui/react";
import { environmentManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { App } from "./app.tsx";
import { ConnectionContext } from "./connection.ts";

const FOCUS_CONTROLLED_BY_APP = true;

function enableRefetchWithoutWindow() {
  environmentManager.setIsServer(() => false);
}

enableRefetchWithoutWindow();

async function waitForInFlightQueries(queryClient: QueryClient) {
  const queries = queryClient.getQueryCache().findAll({ fetchStatus: "fetching" });
  await Promise.allSettled(queries.map((query) => query.promise));
}

interface TuiOptions {
  connection: DuckDBConnection;
  receiverUrl: string;
}

export async function startTui({ connection, receiverUrl }: TuiOptions) {
  const renderer = await createCliRenderer({
    autoFocus: !FOCUS_CONTROLLED_BY_APP,
  });
  const keymap = createDefaultOpenTuiKeymap(renderer);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  renderer.keyInput.on("keypress", (key) => {
    if (key.name === "`" && renderer.currentFocusedEditor === null) {
      renderer.console.toggle();
    }
  });

  createRoot(renderer).render(
    <QueryClientProvider client={queryClient}>
      <ConnectionContext value={connection}>
        <KeymapProvider keymap={keymap}>
          <App receiverUrl={receiverUrl} />
        </KeymapProvider>
      </ConnectionContext>
    </QueryClientProvider>,
  );

  return {
    closed: renderer.closed.then(() => waitForInFlightQueries(queryClient)),
  };
}
