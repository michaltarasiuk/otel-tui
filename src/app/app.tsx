import { useKeymap } from "@opentui/keymap/react";
import { useQueryClient } from "@tanstack/react-query";
import { Fragment, Suspense, useState } from "react";

import { LogsPage } from "#logs/logs-page.tsx";
import { MetricSeriesPage } from "#metrics/metric-series-page.tsx";
import { MetricsPage } from "#metrics/metrics-page.tsx";
import { ServicesPage } from "#services/services-page.tsx";
import { TraceComparePage } from "#traces/trace-compare-page.tsx";
import { TraceSpansPage } from "#traces/trace-spans-page.tsx";
import type { MarkedTrace } from "#traces/trace.ts";
import { TracesPage } from "#traces/traces-page.tsx";
import { ErrorBoundary } from "#ui/error-boundary.tsx";
import { FocusScope, KeysScope } from "#ui/focus.tsx";
import { AppKeys, Key } from "#ui/key-hints.tsx";
import { RegionKeys, useRegion } from "#ui/region.tsx";
import { cycle } from "#utils/cycle.ts";

import { activeHelp, Help, type HelpEntry } from "./help.tsx";
import { PageError, PageLoading } from "./page-fallback.tsx";
import { ReceiverStatus } from "./receiver-status.tsx";
import { Screen } from "./screen.tsx";
import { Tabs } from "./tabs.tsx";
import { useEditing } from "./use-editing.ts";
import { usePages } from "./use-pages.ts";
import { Content, TopBar, Window } from "./window.tsx";

const REGIONS = ["tabs", "content"] as const;

interface AppProps {
  httpUrl: string;
  grpcUrl: string;
  mcpUrl?: string | undefined;
  onClear: () => Promise<void>;
}

export function App({ httpUrl, grpcUrl, mcpUrl, onClear }: AppProps) {
  const {
    tab,
    services,
    traces,
    trace,
    compare,
    metrics,
    series,
    logs,
    selectTab,
    open,
    replace,
    reset,
  } = usePages();
  const [region, setRegion] = useRegion(REGIONS);
  const [clears, setClears] = useState(0);
  const [help, setHelp] = useState<HelpEntry[]>();
  const [marked, setMarked] = useState<MarkedTrace>();

  const queryClient = useQueryClient();
  const keymap = useKeymap();
  const editing = useEditing();

  async function clear() {
    try {
      await onClear();
    } catch (error) {
      console.error("Clearing telemetry failed", error);
      return;
    }
    reset();
    setMarked(undefined);
    setClears((clears) => clears + 1);
    await queryClient.resetQueries();
  }

  return (
    <AppKeys
      value={
        <>
          <RegionKeys regions={REGIONS} region={region} onChange={(region) => setRegion(region)}>
            next region
          </RegionKeys>
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
            <FocusScope focused={region === "tabs"} onFocusRequest={() => setRegion("tabs")}>
              <Tabs current={tab} onSelect={(tab) => selectTab(tab)} />
            </FocusScope>
            <ReceiverStatus httpUrl={httpUrl} grpcUrl={grpcUrl} mcpUrl={mcpUrl} />
          </TopBar>
          <FocusScope
            key={clears}
            focused={region === "content"}
            onFocusRequest={() => setRegion("content")}
            onStepOut={(step) => setRegion(cycle(REGIONS, "content", step))}
          >
            <Content>
              <Suspense fallback={<PageLoading />}>
                <Screen mode={services.mode}>
                  <ErrorBoundary fallback={<PageError text="Failed to load services" />}>
                    <ServicesPage
                      onOpenTraces={(service, operation) =>
                        open({ name: "traces", service, operation })
                      }
                    />
                  </ErrorBoundary>
                </Screen>
                <Screen mode={traces.mode}>
                  <ErrorBoundary
                    fallback={<PageError text="Failed to load traces" onBack={traces.back} />}
                  >
                    <Fragment key={traces.service}>
                      <TracesPage
                        key={traces.operation}
                        service={traces.service}
                        operation={traces.operation}
                        marked={marked}
                        onServiceChange={(service) => replace({ name: "traces", service })}
                        onOpen={(traceId, spanId) => open({ name: "trace", traceId, spanId })}
                        onMark={(marked) => setMarked(marked)}
                        onCompare={(before, after) => open({ name: "compare", before, after })}
                        onBack={traces.back}
                      />
                    </Fragment>
                  </ErrorBoundary>
                </Screen>
                {compare !== undefined && (
                  <Screen mode={compare.mode}>
                    <ErrorBoundary
                      fallback={<PageError text="Failed to load traces" onBack={compare.back} />}
                    >
                      <Fragment key={compare.before}>
                        <TraceComparePage
                          key={compare.after}
                          before={compare.before}
                          after={compare.after}
                          onBack={compare.back}
                          onOpenTrace={(traceId, spanId) =>
                            open({ name: "trace", traceId, spanId })
                          }
                        />
                      </Fragment>
                    </ErrorBoundary>
                  </Screen>
                )}
                {trace !== undefined && (
                  <Screen mode={trace.mode}>
                    <ErrorBoundary
                      fallback={<PageError text="Failed to load trace" onBack={trace.back} />}
                    >
                      <Fragment key={trace.traceId}>
                        <TraceSpansPage
                          key={trace.spanId}
                          traceId={trace.traceId}
                          spanId={trace.spanId}
                          marked={marked}
                          onBack={trace.back}
                          onMark={(marked) => setMarked(marked)}
                          onCompare={(before, after) => open({ name: "compare", before, after })}
                          onOpenLogs={(spanId) =>
                            open({ name: "logs", traceId: trace.traceId, spanId })
                          }
                          onOpenTrace={(traceId, spanId) =>
                            open({ name: "trace", traceId, spanId })
                          }
                        />
                      </Fragment>
                    </ErrorBoundary>
                  </Screen>
                )}
                <Screen mode={metrics.mode}>
                  <ErrorBoundary fallback={<PageError text="Failed to load metrics" />}>
                    <MetricsPage onOpen={(metric) => open({ name: "series", metric })} />
                  </ErrorBoundary>
                </Screen>
                {series !== undefined && (
                  <Screen mode={series.mode}>
                    <ErrorBoundary
                      fallback={<PageError text="Failed to load metric" onBack={series.back} />}
                    >
                      <MetricSeriesPage
                        key={series.metric.metric_id}
                        metric={series.metric}
                        onBack={series.back}
                        onOpenTrace={(traceId, spanId) => open({ name: "trace", traceId, spanId })}
                      />
                    </ErrorBoundary>
                  </Screen>
                )}
                <Screen mode={logs.mode}>
                  <ErrorBoundary
                    fallback={<PageError text="Failed to load logs" onBack={logs.back} />}
                  >
                    <LogsPage
                      traceId={logs.traceId}
                      spanId={logs.spanId}
                      onTraceChange={(traceId) => replace({ name: "logs", traceId })}
                      onOpenTrace={(traceId, spanId) => open({ name: "trace", traceId, spanId })}
                      onBack={logs.back}
                    />
                  </ErrorBoundary>
                </Screen>
              </Suspense>
            </Content>
          </FocusScope>
        </KeysScope>
        {help !== undefined && <Help entries={help} onClose={() => setHelp(undefined)} />}
      </Window>
    </AppKeys>
  );
}
