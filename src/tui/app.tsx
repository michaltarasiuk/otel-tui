import type { ReceiverUrls } from "#receiver/receiver.ts";

import { FocusScope } from "./components/focus.tsx";
import { AppKeys, StepKeys } from "./components/key-hints.tsx";
import { Screen } from "./components/screen.tsx";
import { LogsPage } from "./logs/logs-page.tsx";
import { MetricPage } from "./metrics/metric-page.tsx";
import { MetricsPage } from "./metrics/metrics-page.tsx";
import { usePages } from "./pages.ts";
import { ReceiverStatus } from "./receiver-status.tsx";
import { Tabs } from "./tabs.tsx";
import { TracePage } from "./traces/trace-page.tsx";
import { TracesPage } from "./traces/traces-page.tsx";
import { useFocusedRegion } from "./use-focused-region.ts";
import { TopBar, Window } from "./window.tsx";

interface AppProps {
  receiverUrls: ReceiverUrls;
}

export function App({ receiverUrls }: AppProps) {
  const { region, focusStep } = useFocusedRegion();
  const { page, logsTraceId, canGoBack, selectTab, open, replace, back } = usePages();

  return (
    <AppKeys
      value={
        <>
          <StepKeys forward="tab" backward="shift+tab" onStep={(step) => focusStep(step)}>
            next region
          </StepKeys>
        </>
      }
    >
      <Window>
        <TopBar>
          <FocusScope focused={region === "tabs"}>
            <Tabs current={page.tab} onSelect={(tab) => selectTab(tab)} />
          </FocusScope>
          <ReceiverStatus receiverUrls={receiverUrls} />
        </TopBar>
        <FocusScope focused={region === "content"}>
          <Screen when={page.name === "traces"}>
            <TracesPage onOpen={(traceId) => open({ name: "trace", traceId })} />
          </Screen>
          {page.name === "trace" && (
            <TracePage
              key={`${page.traceId}:${page.spanId}`}
              traceId={page.traceId}
              spanId={page.spanId}
              onBack={() => back()}
              onOpenLogs={() => open({ name: "logs", traceId: page.traceId })}
            />
          )}
          <Screen when={page.name === "metrics"}>
            <MetricsPage onOpen={(metric) => open({ name: "metric", metric })} />
          </Screen>
          {page.name === "metric" && <MetricPage metric={page.metric} onBack={() => back()} />}
          <Screen when={page.name === "logs"}>
            <LogsPage
              traceId={logsTraceId}
              onTraceChange={(traceId) => replace({ name: "logs", traceId })}
              onOpenTrace={(traceId, spanId) => open({ name: "trace", traceId, spanId })}
              onBack={canGoBack ? () => back() : undefined}
            />
          </Screen>
        </FocusScope>
      </Window>
    </AppKeys>
  );
}
