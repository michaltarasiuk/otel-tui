import { useKeymap } from "@opentui/keymap/react";
import { useQueryClient } from "@tanstack/react-query";
import { Fragment, Suspense, useState } from "react";

import { ErrorBoundary } from "./components/error-boundary.tsx";
import { FocusScope, KeysScope } from "./components/focus.tsx";
import { AppKeys, Key, StepKeys } from "./components/key-hints.tsx";
import { PageError, PageLoading } from "./components/page-fallback.tsx";
import { Screen } from "./components/screen.tsx";
import { activeHelp, Help, type HelpEntry } from "./help.tsx";
import { LogsPage } from "./logs/logs-page.tsx";
import { MetricSeriesPage } from "./metrics/metric-series-page.tsx";
import { MetricsPage } from "./metrics/metrics-page.tsx";
import { usePages } from "./pages.ts";
import { ReceiverStatus } from "./receiver-status.tsx";
import { ServicesPage } from "./services/services-page.tsx";
import { Tabs } from "./tabs.tsx";
import { TraceSpansPage } from "./traces/trace-spans-page.tsx";
import { TracesPage } from "./traces/traces-page.tsx";
import { useEditing } from "./use-editing.ts";
import { useFocusedRegion } from "./use-focused-region.ts";
import { TopBar, Window } from "./window.tsx";

interface AppProps {
  httpUrl: string;
  grpcUrl: string;
  mcpUrl?: string | undefined;
  onClear: () => Promise<void>;
}

export function App({ httpUrl, grpcUrl, mcpUrl, onClear }: AppProps) {
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
            <ReceiverStatus httpUrl={httpUrl} grpcUrl={grpcUrl} mcpUrl={mcpUrl} />
          </TopBar>
          <FocusScope
            key={clears}
            focused={region === "content"}
            onFocusRequest={() => focus("content")}
          >
            <Suspense fallback={<PageLoading />}>
              <Screen mode={page === "services" ? "visible" : "hidden"}>
                <ErrorBoundary fallback={<PageError text="Failed to load services" />}>
                  <ServicesPage
                    onOpenTraces={(service, operation) =>
                      open({ name: "traces", service, operation })
                    }
                  />
                </ErrorBoundary>
              </Screen>
              <Screen mode={page === "traces" ? "visible" : "hidden"}>
                <ErrorBoundary
                  fallback={
                    <PageError
                      text="Failed to load traces"
                      onBack={canGoBack ? () => back() : undefined}
                    />
                  }
                >
                  <Fragment key={tracesService}>
                    <TracesPage
                      key={tracesOperation}
                      service={tracesService}
                      operation={tracesOperation}
                      onServiceChange={(service) => replace({ name: "traces", service })}
                      onOpen={(traceId, spanId) => open({ name: "trace", traceId, spanId })}
                      onBack={canGoBack ? () => back() : undefined}
                    />
                  </Fragment>
                </ErrorBoundary>
              </Screen>
              {trace !== undefined && (
                <Screen mode={page === "trace" ? "visible" : "hidden"}>
                  <ErrorBoundary
                    fallback={<PageError text="Failed to load trace" onBack={() => back()} />}
                  >
                    <TraceSpansPage
                      key={`${trace.traceId}:${trace.spanId}`}
                      traceId={trace.traceId}
                      spanId={trace.spanId}
                      onBack={() => back()}
                      onOpenLogs={(spanId) =>
                        open({ name: "logs", traceId: trace.traceId, spanId })
                      }
                      onOpenTrace={(traceId, spanId) => open({ name: "trace", traceId, spanId })}
                    />
                  </ErrorBoundary>
                </Screen>
              )}
              <Screen mode={page === "metrics" ? "visible" : "hidden"}>
                <ErrorBoundary fallback={<PageError text="Failed to load metrics" />}>
                  <MetricsPage onOpen={(metric) => open({ name: "metric", metric })} />
                </ErrorBoundary>
              </Screen>
              {metric !== undefined && (
                <Screen mode={page === "metric" ? "visible" : "hidden"}>
                  <ErrorBoundary
                    fallback={<PageError text="Failed to load metric" onBack={() => back()} />}
                  >
                    <MetricSeriesPage
                      key={metric.metric_id}
                      metric={metric}
                      onBack={() => back()}
                      onOpenTrace={(traceId, spanId) => open({ name: "trace", traceId, spanId })}
                    />
                  </ErrorBoundary>
                </Screen>
              )}
              <Screen mode={page === "logs" ? "visible" : "hidden"}>
                <ErrorBoundary
                  fallback={
                    <PageError
                      text="Failed to load logs"
                      onBack={canGoBack ? () => back() : undefined}
                    />
                  }
                >
                  <LogsPage
                    traceId={logsTrace?.traceId}
                    spanId={logsTrace?.spanId}
                    onTraceChange={(traceId) => replace({ name: "logs", traceId })}
                    onOpenTrace={(traceId, spanId) => open({ name: "trace", traceId, spanId })}
                    onBack={canGoBack ? () => back() : undefined}
                  />
                </ErrorBoundary>
              </Screen>
            </Suspense>
          </FocusScope>
        </KeysScope>
        {help !== undefined && <Help entries={help} onClose={() => setHelp(undefined)} />}
      </Window>
    </AppKeys>
  );
}
