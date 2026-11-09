import { useKeymap } from "@opentui/keymap/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { ReceiverUrls } from "#receiver/receiver.ts";

import { FocusScope, KeysScope } from "./components/focus.tsx";
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
  mcpUrl?: string | undefined;
  onClear: () => Promise<void>;
}

export function App({ receiverUrls, mcpUrl, onClear }: AppProps) {
  const { region, focus, focusStep } = useFocusedRegion();
  const {
    page,
    tab,
    tracesService,
    tracesOperation,
    trace,
    metric,
    logsTrace,
    canGoBack,
    selectTab,
    open,
    replace,
    reset,
    back,
  } = usePages();
  const queryClient = useQueryClient();
  const [clears, setClears] = useState(0);
  const keymap = useKeymap();
  const editing = useEditing();
  const [help, setHelp] = useState<HelpEntry[]>();

  async function clear() {
    try {
      await onClear();
    } catch (error) {
      console.error("Clearing telemetry failed", error);
      return;
    }
    reset();
    setClears((clears) => clears + 1);
    await queryClient.resetQueries();
  }

  return (
    <AppKeys
      value={
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
          <Key name="ctrl+l" description="clear telemetry" onPress={() => clear()} />
        </>
      }
    >
      <Window>
        <KeysScope enabled={help === undefined}>
          <TopBar>
            <FocusScope focused={region === "tabs"} onFocusRequest={() => focus("tabs")}>
              <Tabs current={tab} onSelect={(tab) => selectTab(tab)} />
            </FocusScope>
            <ReceiverStatus receiverUrls={receiverUrls} mcpUrl={mcpUrl} />
          </TopBar>
          <FocusScope
            key={clears}
            focused={region === "content"}
            onFocusRequest={() => focus("content")}
          >
            <Screen when={page === "services"}>
              <ServicesPage
                onOpenTraces={(service, operation) => open({ name: "traces", service, operation })}
              />
            </Screen>
            <Screen when={page === "traces"}>
              <TracesPage
                key={tracesOperation}
                service={tracesService}
                operation={tracesOperation}
                onServiceChange={(service) => replace({ name: "traces", service })}
                onOpen={(traceId, spanId) => open({ name: "trace", traceId, spanId })}
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
        </KeysScope>
        {help !== undefined && <Help entries={help} onClose={() => setHelp(undefined)} />}
      </Window>
    </AppKeys>
  );
}
