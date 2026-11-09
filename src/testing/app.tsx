import type { DuckDBConnection } from "@duckdb/node-api";
import { focusManager, QueryClient } from "@tanstack/react-query";

import { App } from "#tui/app.tsx";
import { ClipboardContext } from "#tui/clipboard.tsx";
import type { Tab } from "#tui/pages.ts";
import { QUERY_CLIENT_CONFIG, QueryProvider, waitForInFlightQueries } from "#tui/tui.tsx";

import type { TestReceiver } from "./receiver.ts";
import { render } from "./render.tsx";
import { keyHints, onList, pageHeader, tableRows } from "./screen.ts";

const DEFAULT_SIZE = { width: 120, height: 30 };

const TAB_ORDER = ["services", "traces", "metrics", "logs"] as const satisfies Tab[];

const PAGE_COUNTS = {
  services: / services?$/,
  traces: / traces?$/,
  metrics: / metrics?$/,
  logs: / logs?$/,
} satisfies Record<Tab, RegExp>;

export interface AppOptions {
  size?: { width: number; height: number } | undefined;
  connection?: DuckDBConnection;
  copied?: string[];
}

export async function renderApp(
  receiver: TestReceiver,
  { size = DEFAULT_SIZE, connection, copied = [] }: AppOptions = {},
) {
  const queryClient = new QueryClient(QUERY_CLIENT_CONFIG);

  const screen = await render(
    <QueryProvider queryClient={queryClient} connection={connection ?? (await receiver.connect())}>
      <ClipboardContext
        value={async (text) => {
          copied.push(text);
          return true;
        }}
      >
        <App receiverUrls={receiver.urls} onClear={() => receiver.clear()} />
      </ClipboardContext>
    </QueryProvider>,
    size,
  );

  function waitForRows(rows: string[]) {
    return screen.waitForFrame((frame) => Bun.deepEquals(tableRows(frame), rows));
  }

  return {
    ...screen,
    waitForRows,
    async [Symbol.asyncDispose]() {
      await screen[Symbol.asyncDispose]();
      focusManager.setFocused(undefined);
      await waitForInFlightQueries(queryClient);
    },
  };
}

export type TestApp = Awaited<ReturnType<typeof renderApp>>;

function onPage(tab: Tab) {
  return (frame: string) => PAGE_COUNTS[tab].test(pageHeader(frame));
}

export async function renderPage(receiver: TestReceiver, tab: Tab, options?: AppOptions) {
  const app = await renderApp(receiver, options);
  await app.waitForFrame(onPage("services"));
  for (const next of TAB_ORDER.slice(1, TAB_ORDER.indexOf(tab) + 1)) {
    app.mockInput.pressArrow("right");
    await app.waitForFrame(onPage(next));
  }
  app.mockInput.pressTab();
  await app.waitForFrame(onList);
  return app;
}

export async function selectRow(app: TestApp, rows: string[], row: string) {
  for (const next of rows.slice(1, rows.indexOf(row) + 1)) {
    app.mockInput.pressArrow("down");
    await app.waitForSelection(next);
  }
}

export async function search(app: TestApp, text: string) {
  app.mockInput.pressKey("/");
  await app.waitForFrame((frame) => keyHints(frame).includes("return apply"));
  await app.mockInput.typeText(text);
}
