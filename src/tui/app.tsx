import { useKeymap } from "@opentui/keymap/react";
import { useState } from "react";

import type { ReceiverUrls } from "#receiver/receiver.ts";

import { FocusScope } from "./components/focus.tsx";
import { AppKeys, Key, StepKeys } from "./components/key-hints.tsx";
import { Screen } from "./components/screen.tsx";
import { activeHelp, Help, type HelpEntry } from "./help.tsx";
import { LogsPage } from "./logs/logs-page.tsx";
import { MetricPage } from "./metrics/metric-page.tsx";
import { MetricsPage } from "./metrics/metrics-page.tsx";
import { usePages } from "./pages.ts";
import { ReceiverStatus } from "./receiver-status.tsx";
import { ServicesPage } from "./services/services-page.tsx";
import { Tabs } from "./tabs.tsx";
import { TracePage } from "./traces/trace-page.tsx";
import { TracesPage } from "./traces/traces-page.tsx";
import { useEditing } from "./use-editing.ts";
import { useFocusedRegion } from "./use-focused-region.ts";
import { TopBar, Window } from "./window.tsx";

interface AppProps {
  receiverUrls: ReceiverUrls;
}

export function App({ receiverUrls }: AppProps) {
  const { region, focusStep } = useFocusedRegion();
  const {
    page,
    tab,
    tracesService,
    trace,
    metric,
    logsTrace,
    canGoBack,
    selectTab,
    open,
    replace,
    back,
  } = usePages();
  const keymap = useKeymap();
  const editing = useEditing();
  const [help, setHelp] = useState<HelpEntry[]>();

  return (
    <AppKeys
      value={
        help === undefined && (
          <>
            <StepKeys
              forward="tab"
              backwardDescription="previous region"
              backward="shift+tab"
              onStep={(step) => focusStep(step)}
            >
              next region
            </StepKeys>
            {!editing && (
              <Key name="?" onPress={() => setHelp(activeHelp(keymap))}>
                help
              </Key>
            )}
          </>
        )
      }
    >
      <Window>
        <FocusScope focused={help === undefined}>
          <TopBar>
            <FocusScope focused={region === "tabs"}>
              <Tabs current={tab} onSelect={(tab) => selectTab(tab)} />
            </FocusScope>
            <ReceiverStatus receiverUrls={receiverUrls} />
          </TopBar>
          <FocusScope focused={region === "content"}>
            <Screen when={page === "services"}>
              <ServicesPage onOpenTraces={(service) => open({ name: "traces", service })} />
            </Screen>
            <Screen when={page === "traces"}>
              <TracesPage
                service={tracesService}
                onServiceChange={(service) => replace({ name: "traces", service })}
                onOpen={(traceId) => open({ name: "trace", traceId })}
                onBack={canGoBack ? () => back() : undefined}
              />
            </Screen>
            {trace !== undefined && (
              <Screen when={page === "trace"}>
                <TracePage
                  key={`${trace.traceId}:${trace.spanId}`}
                  traceId={trace.traceId}
                  spanId={trace.spanId}
                  onBack={() => back()}
                  onOpenLogs={(spanId) => open({ name: "logs", traceId: trace.traceId, spanId })}
                  onOpenTrace={(traceId, spanId) => open({ name: "trace", traceId, spanId })}
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
        </FocusScope>
        {help !== undefined && <Help entries={help} onClose={() => setHelp(undefined)} />}
      </Window>
    </AppKeys>
  );
}
