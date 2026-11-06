import { createContext, use, useState } from "react";

import type { Tab } from "./tabs.tsx";

interface OpenTrace {
  traceId: string;
  spanId: string | undefined;
}

interface Location {
  tab: Tab;
  trace: OpenTrace | undefined;
  logsTraceId: string | undefined;
}

interface History {
  location: Location;
  previous: Location[];
}

interface Navigation extends Location {
  canGoBack: boolean;
  setTab: (tab: Tab) => void;
  openTrace: (traceId: string, spanId?: string) => void;
  closeTrace: () => void;
  openLogs: (traceId: string) => void;
  setLogsTraceId: (traceId: string | undefined) => void;
  goBack: () => void;
}

const START_HISTORY: History = {
  location: { tab: "traces", trace: undefined, logsTraceId: undefined },
  previous: [],
};

function replace({ location, previous }: History, change: Partial<Location>): History {
  return { location: { ...location, ...change }, previous };
}

function push({ location, previous }: History, change: Partial<Location>): History {
  return { location: { ...location, ...change }, previous: [...previous, location] };
}

function pop(history: History): History {
  const location = history.previous.at(-1);
  if (location === undefined) {
    return history;
  }
  return { location, previous: history.previous.slice(0, -1) };
}

function switchTab(history: History, tab: Tab): History {
  if (tab === history.location.tab) {
    return history;
  }
  return { location: { ...history.location, tab }, previous: [] };
}

const NavigationContext = createContext<Navigation | undefined>(undefined);

interface NavigationProviderProps {
  children: React.ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [history, setHistory] = useState(START_HISTORY);

  return (
    <NavigationContext
      value={{
        ...history.location,
        canGoBack: history.previous.length > 0,
        setTab(tab) {
          setHistory((history) => switchTab(history, tab));
        },
        openTrace(traceId, spanId) {
          setHistory((history) => push(history, { tab: "traces", trace: { traceId, spanId } }));
        },
        closeTrace() {
          setHistory((history) => replace(history, { trace: undefined }));
        },
        openLogs(traceId) {
          setHistory((history) => push(history, { tab: "logs", logsTraceId: traceId }));
        },
        setLogsTraceId(traceId) {
          setHistory((history) => replace(history, { logsTraceId: traceId }));
        },
        goBack() {
          setHistory((history) => pop(history));
        },
      }}
    >
      {children}
    </NavigationContext>
  );
}

export function useNavigation() {
  const navigation = use(NavigationContext);
  if (navigation === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return navigation;
}
