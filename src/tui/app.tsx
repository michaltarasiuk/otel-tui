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
  const { page, tab, trace, metric, logsTrace, canGoBack, selectTab, open, replace, back } =
    usePages();

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
            <Tabs current={tab} onSelect={(tab) => selectTab(tab)} />
          </FocusScope>
          <ReceiverStatus receiverUrls={receiverUrls} />
        </TopBar>
        <FocusScope focused={region === "content"}>
          <Screen when={page === "traces"}>
            <TracesPage onOpen={(traceId) => open({ name: "trace", traceId })} />
          </Screen>
          {trace !== undefined && (
            <Screen when={page === "trace"}>
              <TracePage
                key={`${trace.traceId}:${trace.spanId}`}
                traceId={trace.traceId}
                spanId={trace.spanId}
                onBack={() => back()}
                onOpenLogs={(spanId) => open({ name: "logs", traceId: trace.traceId, spanId })}
              />
            </Screen>
          )}
          <Screen when={page === "metrics"}>
            <MetricsPage onOpen={(metric) => open({ name: "metric", metric })} />
          </Screen>
          {metric !== undefined && (
            <Screen when={page === "metric"}>
              <MetricPage
                key={metric.metric_id}
                metric={metric}
                onBack={() => back()}
                onOpenTrace={(traceId, spanId) => open({ name: "trace", traceId, spanId })}
              />
            </Screen>
          )}
          <Screen when={page === "logs"}>
            <LogsPage
              traceId={logsTrace?.traceId}
              spanId={logsTrace?.spanId}
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
