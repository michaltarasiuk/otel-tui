import { environmentManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { App } from "../tui/app.tsx";
import { ConnectionContext } from "../tui/connection.ts";
import type { TestReceiver } from "./receiver.ts";
import { render } from "./render.tsx";

const APP_SIZE = { width: 120, height: 30 };

function enableRefetchWithoutWindow() {
  environmentManager.setIsServer(() => false);
}

enableRefetchWithoutWindow();

export async function renderApp(receiver: TestReceiver, size = APP_SIZE) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const connection = await receiver.connect();

  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <ConnectionContext value={connection}>
        <App receiverUrl={receiver.url} />
      </ConnectionContext>
    </QueryClientProvider>,
    size,
  );

  return {
    ...screen,
    async [Symbol.asyncDispose]() {
      await screen[Symbol.asyncDispose]();
      const queries = queryClient.getQueryCache().findAll({ fetchStatus: "fetching" });
      await Promise.allSettled(queries.map((query) => query.promise));
    },
  };
}
