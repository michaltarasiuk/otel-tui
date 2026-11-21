import type { DuckDBConnection } from "@duckdb/node-api";
import { focusManager, QueryClient } from "@tanstack/react-query";

import { App } from "#app/app.tsx";
import { QUERY_CLIENT_CONFIG, QueryProvider, waitForInFlightQueries } from "#app/tui.tsx";
import type { Tab } from "#app/use-pages.ts";
import { ClipboardContext } from "#ui/clipboard.tsx";

import type { TestReceiver } from "./receiver.ts";
import { render } from "./render.tsx";
import { keyHints, onList, pageHeader, tableRows, tabStyles } from "./screen.ts";

const DEFAULT_SIZE = { width: 120, height: 30 };

const TAB_ORDER = ["services", "traces", "metrics", "logs"] as const satisfies Tab[];

const TAB_NAMES = {
  services: "Services",
  traces: "Traces",
  metrics: "Metrics",
  logs: "Logs",
} satisfies Record<Tab, string>;

const PAGE_COUNTS = {
  services: / services?$/,
  traces: / traces?$/,
  metrics: / metrics?$/,
  logs: / logs?$/,
} satisfies Record<Tab, RegExp>;

export interface AppOptions {
  size?: { width: number; height: number } | undefined;
  connection?: DuckDBConnection;
}

export async function renderApp(
  receiver: TestReceiver,
  { size = DEFAULT_SIZE, connection }: AppOptions = {},
) {
  const queryClient = new QueryClient(QUERY_CLIENT_CONFIG);
  const copied: string[] = [];

  const screen = await render(
    <QueryProvider queryClient={queryClient} connection={connection ?? (await receiver.connect())}>
      <ClipboardContext
        value={async (text) => {
          copied.push(text);
          return true;
        }}
      >
        <App
          httpUrl={receiver.httpUrl}
          grpcUrl={receiver.grpcUrl}
          onClear={() => receiver.clear()}
        />
      </ClipboardContext>
    </QueryProvider>,
    size,
  );

  function waitForRows(rows: string[]) {
    return screen.waitForFrame(
      (frame) => Bun.deepEquals(tableRows(frame), rows),
      `table rows ${JSON.stringify(rows, null, 2)}`,
    );
  }

  function waitForPage(tab: Tab) {
    return screen.waitForFrame(
      (frame) => PAGE_COUNTS[tab].test(pageHeader(frame)),
      `the ${tab} page`,
    );
  }

  // Walks the tab bar from the current tab to `tab`, waiting for each page.
  // The tab bar must have focus: only then is it the selected row.
  async function openTab(tab: Tab) {
    const tabBar = Object.values(TAB_NAMES).join(" ");
    await screen.waitForSelection(tabBar);
    const frame = await screen.captureSpans();
    const styles = tabStyles(frame);
    const current = TAB_ORDER.find((name) => styles[TAB_NAMES[name]]?.highlighted === true);
    if (current === undefined) {
      throw new Error(`openTab("${tab}") found no highlighted tab`);
    }
    const from = TAB_ORDER.indexOf(current);
    const to = TAB_ORDER.indexOf(tab);
    const path =
      to < from ? TAB_ORDER.slice(to, from).toReversed() : TAB_ORDER.slice(from + 1, to + 1);
    for (const next of path) {
      screen.mockInput.pressArrow(to < from ? "left" : "right");
      await waitForPage(next);
    }
  }

  async function search(text: string) {
    screen.mockInput.pressKey("/");
    await screen.waitForFrame(
      (frame) => keyHints(frame).includes("return apply"),
      "the search input",
    );
    await screen.mockInput.typeText(text);
  }

  return {
    ...screen,
    copied,
    waitForRows,
    waitForPage,
    openTab,
    search,
    async [Symbol.asyncDispose]() {
      await settleQueries(queryClient);
      await screen[Symbol.asyncDispose]();
      focusManager.setFocused(undefined);
    },
  };
}

export type TestApp = Awaited<ReturnType<typeof renderApp>>;

export async function renderPage(receiver: TestReceiver, tab: Tab, options?: AppOptions) {
  const app = await renderApp(receiver, options);
  await app.openTab(tab);
  app.mockInput.pressTab();
  await app.waitForFrame(onList);
  return app;
}

export async function renderFailedPage(
  receiver: TestReceiver,
  tab: Exclude<Tab, "services">,
  options?: AppOptions,
) {
  const app = await renderApp(receiver, options);
  const previous = TAB_ORDER[TAB_ORDER.indexOf(tab) - 1] ?? "services";
  await app.openTab(previous);
  app.mockInput.pressArrow("right");
  await app.waitForText("Failed to load");
  app.mockInput.pressTab();
  await app.waitForFrame((frame) => keyHints(frame).includes("r retry"), "the retry key");
  return app;
}

// React crashes when a suspended query settles after its Activity has unmounted,
// so let every load finish, and the renders it triggers, before unmounting.
async function settleQueries(queryClient: QueryClient) {
  while (queryClient.isFetching() > 0) {
    await waitForInFlightQueries(queryClient);
    await new Promise((resolve) => setImmediate(resolve));
  }
}
