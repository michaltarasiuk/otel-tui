import { QueryClient } from "@tanstack/react-query";

import { QUERY_CLIENT_CONFIG, TuiRoot, waitForInFlightQueries } from "../tui/tui.tsx";
import type { TestReceiver } from "./receiver.ts";
import { render } from "./render.tsx";

const APP_SIZE = { width: 120, height: 30 };

export async function renderApp(receiver: TestReceiver, size = APP_SIZE) {
  const queryClient = new QueryClient(QUERY_CLIENT_CONFIG);
  const connection = await receiver.connect();

  const screen = await render(
    <TuiRoot queryClient={queryClient} connection={connection} receiverUrls={receiver.urls} />,
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
