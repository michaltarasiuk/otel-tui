import { QueryClient } from "@tanstack/react-query";

import { App } from "#tui/app.tsx";
import { QUERY_CLIENT_CONFIG, QueryProvider, waitForInFlightQueries } from "#tui/tui.tsx";

import type { TestReceiver } from "./receiver.ts";
import { render } from "./render.tsx";

export async function renderApp(receiver: TestReceiver, size = { width: 120, height: 30 }) {
  const queryClient = new QueryClient(QUERY_CLIENT_CONFIG);
  const connection = await receiver.connect();

  const screen = await render(
    <QueryProvider queryClient={queryClient} connection={connection}>
      <App receiverUrls={receiver.urls} />
    </QueryProvider>,
    size,
  );

  return {
    ...screen,
    async [Symbol.asyncDispose]() {
      await screen[Symbol.asyncDispose]();
      await waitForInFlightQueries(queryClient);
    },
  };
}
