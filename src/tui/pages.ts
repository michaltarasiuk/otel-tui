import { useState } from "react";

import type { Metric } from "./metrics/metric.ts";

export type Tab = "traces" | "metrics" | "logs";

interface TraceLocation {
  traceId: string;
  spanId: string | undefined;
}

interface Location {
  tab: Tab;
  trace: TraceLocation | undefined;
  metric: Metric | undefined;
  logsTrace: TraceLocation | undefined;
}

interface History {
  location: Location;
  previous: Location[];
}

type PageName = "traces" | "trace" | "metrics" | "metric" | "logs";

type Destination =
  | { name: "trace"; traceId: string; spanId?: string | undefined }
  | { name: "metric"; metric: Metric }
  | { name: "logs"; traceId: string | undefined; spanId?: string | undefined };

const START_HISTORY: History = {
  location: { tab: "traces", trace: undefined, metric: undefined, logsTrace: undefined },
  previous: [],
};

function pageAt({ tab, trace, metric }: Location): PageName {
  switch (tab) {
    case "traces":
      return trace === undefined ? "traces" : "trace";
    case "metrics":
      return metric === undefined ? "metrics" : "metric";
    case "logs":
      return "logs";
  }
}

function change(destination: Destination): Partial<Location> {
  switch (destination.name) {
    case "trace":
      return {
        tab: "traces",
        trace: { traceId: destination.traceId, spanId: destination.spanId },
      };
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

function replace({ location, previous }: History, change: Partial<Location>): History {
  return {
    location: { ...location, ...change },
    previous,
  };
}

function push({ location, previous }: History, change: Partial<Location>): History {
  return {
    location: { ...location, ...change },
    previous: [...previous, location],
  };
}

function pop(history: History): History {
  const location = history.previous.at(-1);
  if (location === undefined) {
    return history;
  }
  return {
    location,
    previous: history.previous.slice(0, -1),
  };
}

function close(history: History): History {
  switch (history.location.tab) {
    case "traces":
      return replace(history, { trace: undefined });
    case "metrics":
      return replace(history, { metric: undefined });
    case "logs":
      return replace(history, { logsTrace: undefined });
  }
}

function switchTab(history: History, tab: Tab): History {
  if (tab === history.location.tab) {
    return history;
  }
  return {
    location: { ...history.location, tab },
    previous: [],
  };
}

export function usePages() {
  const [history, setHistory] = useState(START_HISTORY);

  return {
    page: pageAt(history.location),
    tab: history.location.tab,
    trace: history.location.trace,
    metric: history.location.metric,
    logsTrace: history.location.logsTrace,
    canGoBack: history.previous.length > 0,
    selectTab: (tab: Tab) => {
      setHistory((history) => switchTab(history, tab));
    },
    open: (destination: Destination) => {
      setHistory((history) => push(history, change(destination)));
    },
    replace: (destination: Destination) => {
      setHistory((history) => replace(history, change(destination)));
    },
    back: () => {
      setHistory((history) => (history.previous.length > 0 ? pop(history) : close(history)));
    },
  };
}
