import { createContext, use, useState } from "react";

import type { Tab } from "./tabs.tsx";

interface Navigation {
  tab: Tab;
  openTraceId: string | undefined;
  logsTraceId: string | undefined;
  setTab: (tab: Tab) => void;
  openTrace: (traceId: string) => void;
  closeTrace: () => void;
  setLogsTraceId: (traceId: string | undefined) => void;
}

const NavigationContext = createContext<Navigation | undefined>(undefined);

interface NavigationProviderProps {
  children: React.ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [tab, setTab] = useState<Tab>("traces");
  const [openTraceId, setOpenTraceId] = useState<string>();
  const [logsTraceId, setLogsTraceId] = useState<string>();

  return (
    <NavigationContext
      value={{
        tab,
        openTraceId,
        logsTraceId,
        setTab,
        openTrace(traceId) {
          setOpenTraceId(traceId);
          setTab("traces");
        },
        closeTrace() {
          setOpenTraceId(undefined);
        },
        setLogsTraceId,
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
