import { useDeferredValue, useState } from "react";

import type { Metric } from "#metrics/metric.ts";

export type Tab = "services" | "traces" | "metrics" | "logs";

interface TraceLocation {
  traceId: string;
  spanId: string | undefined;
}

interface Location {
  tab: Tab;
  tracesService: string | undefined;
  tracesOperation: string | undefined;
  trace: TraceLocation | undefined;
  metric: Metric | undefined;
  logsTrace: TraceLocation | undefined;
}

interface History {
  location: Location;
  previous: Location[];
}

type PageName = "services" | "traces" | "trace" | "metrics" | "metric" | "logs";

type Destination =
  | { name: "traces"; service: string | undefined; operation?: string | undefined }
  | { name: "trace"; traceId: string; spanId?: string | undefined }
  | { name: "metric"; metric: Metric }
  | { name: "logs"; traceId: string | undefined; spanId?: string | undefined };

const START_LOCATION: Location = {
  tab: "services",
  tracesService: undefined,
  tracesOperation: undefined,
  trace: undefined,
  metric: undefined,
  logsTrace: undefined,
};

function pageAt({ tab, trace, metric }: Location): PageName {
  switch (tab) {
    case "services":
      return "services";
    case "traces":
      return trace === undefined ? "traces" : "trace";
    case "metrics":
      return metric === undefined ? "metrics" : "metric";
    case "logs":
      return "logs";
  }
}

function changeTo(destination: Destination): Partial<Location> {
  switch (destination.name) {
    case "traces":
      return {
        tab: "traces",
        tracesService: destination.service,
        tracesOperation: destination.operation,
        trace: undefined,
      };
    case "trace":
      return { tab: "traces", trace: { traceId: destination.traceId, spanId: destination.spanId } };
    case "metric":
      return { tab: "metrics", metric: destination.metric };
    case "logs":
      return {
        tab: "logs",
        logsTrace:
          destination.traceId === undefined
            ? undefined
            : { traceId: destination.traceId, spanId: destination.spanId },
      };
  }
}

function closeChange(tab: Tab): Partial<Location> {
  switch (tab) {
    case "services":
      return {};
    case "traces":
      return { trace: undefined };
    case "metrics":
      return { metric: undefined };
    case "logs":
      return { logsTrace: undefined };
  }
}

function replace({ location, previous }: History, change: Partial<Location>): History {
  return { location: { ...location, ...change }, previous };
}

function push({ location, previous }: History, change: Partial<Location>): History {
  return { location: { ...location, ...change }, previous: [...previous, location] };
}

function back(history: History): History {
  const location = history.previous.at(-1);
  if (location === undefined) {
    return replace(history, closeChange(history.location.tab));
  }
  return { location, previous: history.previous.slice(0, -1) };
}

function switchTab(history: History, tab: Tab): History {
  if (tab === history.location.tab) {
    return history;
  }
  return { location: { ...history.location, tab }, previous: [] };
}

function restart(history: History): History {
  const location = { ...START_LOCATION, tab: history.location.tab };
  return { location, previous: [] };
}

export function usePages() {
  const [history, setHistory] = useState<History>({ location: START_LOCATION, previous: [] });
  const deferredHistory = useDeferredValue(history);
  const { location, previous } = deferredHistory;

  return {
    page: pageAt(location),
    tab: history.location.tab,
    tracesService: location.tracesService,
    tracesOperation: location.tracesOperation,
    trace: location.trace,
    metric: location.metric,
    logsTrace: location.logsTrace,
    canGoBack: previous.length > 0,
    selectTab: (tab: Tab) => {
      setHistory((history) => switchTab(history, tab));
    },
    open: (destination: Destination) => {
      setHistory((history) => push(history, changeTo(destination)));
    },
    replace: (destination: Destination) => {
      setHistory((history) => replace(history, changeTo(destination)));
    },
    reset: () => {
      setHistory((history) => restart(history));
    },
    back: () => {
      setHistory((history) => back(history));
    },
  };
}
