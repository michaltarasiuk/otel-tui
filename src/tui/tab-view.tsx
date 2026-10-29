import { useState } from "react";

import { FocusScope } from "./focus.tsx";
import { LogsView } from "./logs/logs-view.tsx";
import { MetricsView } from "./metrics/metrics-view.tsx";
import type { Tab } from "./tabs.tsx";
import { TracesView } from "./traces/traces-view.tsx";

interface TabViewProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabView({ tab, onTabChange }: TabViewProps) {
  const [openTraceId, setOpenTraceId] = useState<string>();

  function handleOpenTrace(traceId: string) {
    setOpenTraceId(traceId);
    onTabChange("traces");
  }

  return (
    <>
      <box visible={tab === "traces"} flexGrow={1}>
        <FocusScope focused={tab === "traces"}>
          <TracesView
            openTraceId={openTraceId}
            onOpenTrace={(traceId) => handleOpenTrace(traceId)}
            onCloseTrace={() => setOpenTraceId(undefined)}
          />
        </FocusScope>
      </box>
      <box visible={tab === "metrics"} flexGrow={1}>
        <FocusScope focused={tab === "metrics"}>
          <MetricsView />
        </FocusScope>
      </box>
      <box visible={tab === "logs"} flexGrow={1}>
        <FocusScope focused={tab === "logs"}>
          <LogsView onOpenTrace={(traceId) => handleOpenTrace(traceId)} />
        </FocusScope>
      </box>
    </>
  );
}
