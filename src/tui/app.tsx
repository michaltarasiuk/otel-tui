import type { DuckDBConnection } from "@duckdb/node-api";
import { Activity, useState } from "react";

import { KeyHints } from "./keymap/key-hints.tsx";
import { StatusProvider, useStatusMessage } from "./status/status.tsx";
import { THEME } from "./theme.ts";
import { DuckDbTraceStoreProvider } from "./traces/store/duckdb-store.tsx";
import { TracesView } from "./traces/traces-view.tsx";
import { TabSelect } from "./ui/tab-select.tsx";

type TabId = (typeof TABS)[number]["id"];

const TABS = [
  { id: "traces", title: "Traces" },
  { id: "metrics", title: "Metrics" },
  { id: "logs", title: "Logs" },
] as const;

export interface AppProps {
  receiver: {
    url: string;
    connection: DuckDBConnection;
  };
}

export function App({ receiver }: AppProps) {
  return (
    <StatusProvider>
      <DuckDbTraceStoreProvider connection={receiver.connection}>
        <Screen receiverUrl={receiver.url} />
      </DuckDbTraceStoreProvider>
    </StatusProvider>
  );
}

function Screen({ receiverUrl }: { receiverUrl: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("traces");

  return (
    <box flexGrow={1} paddingX={1}>
      <box flexShrink={0} marginBottom={1}>
        <TabSelect tabs={TABS} onChange={(id) => setActiveTab(id)} />
      </box>
      <box flexGrow={1}>
        {TABS.map(({ id }) => (
          <Activity key={id} mode={id === activeTab ? "visible" : "hidden"}>
            <TabView tab={id} />
          </Activity>
        ))}
      </box>
      <Footer receiverUrl={receiverUrl} />
    </box>
  );
}

function TabView({ tab }: { tab: TabId }) {
  switch (tab) {
    case "traces":
      return <TracesView />;
    case "metrics":
      return null;
    case "logs":
      return null;
    default:
      tab satisfies never;
      throw new Error(`Unknown tab: ${tab}`);
  }
}

function Footer({ receiverUrl }: { receiverUrl: string }) {
  const message = useStatusMessage();
  return (
    <box flexDirection="row" height={1} flexShrink={0} gap={2} marginTop={1}>
      <box flexGrow={1} flexShrink={1}>
        {message === undefined ? (
          <KeyHints />
        ) : (
          <text fg={THEME.success} wrapMode="none" truncate>
            {message}
          </text>
        )}
      </box>
      <text flexShrink={0} fg={THEME.textMuted} wrapMode="none">
        OTLP/HTTP {receiverUrl}
      </text>
    </box>
  );
}
