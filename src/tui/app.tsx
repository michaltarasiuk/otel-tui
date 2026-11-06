import type { ReceiverUrls } from "#receiver/receiver.ts";

import { FocusScope } from "./components/focus.tsx";
import { KeyHints } from "./components/key-hints.tsx";
import { AppContent, AppFooter, AppHeader, AppLayout } from "./layout.tsx";
import { LogsView } from "./logs/logs-view.tsx";
import { MetricsView } from "./metrics/metrics-view.tsx";
import { NavigationProvider } from "./navigation.tsx";
import { ReceiverStatus } from "./receiver-status.tsx";
import { type TabOption, TabPane, Tabs } from "./tabs.tsx";
import { TracesView } from "./traces/traces-view.tsx";
import { useRegion } from "./use-region.ts";

const TABS = [
  { name: "Traces", description: "", value: "traces" },
  { name: "Metrics", description: "", value: "metrics" },
  { name: "Logs", description: "", value: "logs" },
] as const satisfies TabOption[];

interface AppProps {
  receiverUrls: ReceiverUrls;
}

export function App({ receiverUrls }: AppProps) {
  const region = useRegion();

  return (
    <NavigationProvider>
      <AppLayout>
        <AppHeader>
          <FocusScope focused={region === "tabs"}>
            <Tabs tabs={TABS} />
          </FocusScope>
          <ReceiverStatus receiverUrls={receiverUrls} />
        </AppHeader>

        <AppContent>
          <FocusScope focused={region === "content"}>
            <TabPane tab="traces">
              <TracesView />
            </TabPane>
            <TabPane tab="metrics">
              <MetricsView />
            </TabPane>
            <TabPane tab="logs">
              <LogsView />
            </TabPane>
          </FocusScope>
        </AppContent>

        <AppFooter>
          <KeyHints />
        </AppFooter>
      </AppLayout>
    </NavigationProvider>
  );
}
