import { createContext, use, useState } from "react";

import type { Tab } from "./tabs.tsx";

interface Location {
  tab: Tab;
  openTraceId: string | undefined;
  logsTraceId: string | undefined;
}

interface Navigation extends Location {
  setTab: (tab: Tab) => void;
  openTrace: (traceId: string) => void;
  closeTrace: () => void;
  openLogs: (traceId: string) => void;
  setLogsTraceId: (traceId: string | undefined) => void;
}

const START_LOCATION: Location = {
  tab: "traces",
  openTraceId: undefined,
  logsTraceId: undefined,
};

function replace(location: Location, change: Partial<Location>) {
  return { ...location, ...change };
}

const NavigationContext = createContext<Navigation | undefined>(undefined);

interface NavigationProviderProps {
  children: React.ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [location, setLocation] = useState(START_LOCATION);

  return (
    <NavigationContext
      value={{
        ...location,
        setTab(tab) {
          setLocation((location) => replace(location, { tab }));
        },
        openTrace(traceId) {
          setLocation((location) => replace(location, { tab: "traces", openTraceId: traceId }));
        },
        closeTrace() {
          setLocation((location) => replace(location, { openTraceId: undefined }));
        },
        openLogs(traceId) {
          setLocation((location) => replace(location, { tab: "logs", logsTraceId: traceId }));
        },
        setLogsTraceId(traceId) {
          setLocation((location) => replace(location, { logsTraceId: traceId }));
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
