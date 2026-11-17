import { useDeferredValue, useState } from "react";

import type { Metric } from "#metrics/metric.ts";

import type { ScreenMode } from "./screen.tsx";

export type Tab = "services" | "traces" | "metrics" | "logs";

interface TracesLocation {
  service: string | undefined;
  operation: string | undefined;
}

interface TraceLocation {
  traceId: string;
  spanId: string | undefined;
}

interface CompareLocation {
  before: string;
  after: string;
}

interface SeriesLocation {
  metric: Metric;
}

interface LogsLocation {
  traceId: string | undefined;
  spanId: string | undefined;
}

interface Location {
  tab: Tab;
  map: boolean;
  traces: TracesLocation;
  trace: TraceLocation | undefined;
  compare: CompareLocation | undefined;
  series: SeriesLocation | undefined;
  logs: LogsLocation;
}

interface History {
  location: Location;
  previous: Location[];
}

type PageName = "services" | "map" | "traces" | "trace" | "compare" | "metrics" | "series" | "logs";

type Destination =
  | { name: "map" }
  | { name: "traces"; service: string | undefined; operation?: string | undefined }
  | { name: "trace"; traceId: string; spanId?: string | undefined }
  | { name: "compare"; before: string; after: string }
  | { name: "series"; metric: Metric }
  | { name: "logs"; traceId: string | undefined; spanId?: string | undefined };

const ALL_TRACES: TracesLocation = { service: undefined, operation: undefined };
const ALL_LOGS: LogsLocation = { traceId: undefined, spanId: undefined };

const START_LOCATION: Location = {
  tab: "services",
  map: false,
  traces: ALL_TRACES,
  trace: undefined,
  compare: undefined,
  series: undefined,
  logs: ALL_LOGS,
};

function pageAt({ tab, map, trace, compare, series }: Location): PageName {
  switch (tab) {
    case "services":
      return map ? "map" : "services";
    case "traces":
      if (trace !== undefined) {
        return "trace";
      }
      return compare === undefined ? "traces" : "compare";
    case "metrics":
      return series === undefined ? "metrics" : "series";
    case "logs":
      return "logs";
  }
}

function changeTo(destination: Destination): Partial<Location> {
  switch (destination.name) {
    case "map":
      return { tab: "services", map: true };
    case "traces": {
      const { service, operation } = destination;
      return {
        tab: "traces",
        traces: { service, operation },
        trace: undefined,
        compare: undefined,
      };
    }
    case "trace": {
      const { traceId, spanId } = destination;
      return { tab: "traces", trace: { traceId, spanId } };
    }
    case "compare": {
      const { before, after } = destination;
      return { tab: "traces", trace: undefined, compare: { before, after } };
    }
    case "series":
      return { tab: "metrics", series: { metric: destination.metric } };
    case "logs": {
      const { traceId, spanId } = destination;
      return { tab: "logs", logs: { traceId, spanId } };
    }
  }
}

function closeChange({ tab, trace }: Location): Partial<Location> {
  switch (tab) {
    case "services":
      return { map: false };
    case "traces":
      return trace === undefined ? { compare: undefined } : { trace: undefined };
    case "metrics":
      return { series: undefined };
    case "logs":
      return { logs: ALL_LOGS };
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
    return replace(history, closeChange(history.location));
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
  const page = pageAt(location);

  function mode(name: PageName): ScreenMode {
    return name === page ? "visible" : "hidden";
  }

  function goBack() {
    setHistory((history) => back(history));
  }

  const historyBack = previous.length > 0 ? goBack : undefined;

  return {
    tab: history.location.tab,
    services: { mode: mode("services") },
    map: location.map ? { mode: mode("map"), back: goBack } : undefined,
    traces: { ...location.traces, mode: mode("traces"), back: historyBack },
    trace:
      location.trace === undefined
        ? undefined
        : { ...location.trace, mode: mode("trace"), back: goBack },
    compare:
      location.compare === undefined
        ? undefined
        : { ...location.compare, mode: mode("compare"), back: goBack },
    metrics: { mode: mode("metrics") },
    series:
      location.series === undefined
        ? undefined
        : { ...location.series, mode: mode("series"), back: goBack },
    logs: { ...location.logs, mode: mode("logs"), back: historyBack },
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
  };
}
