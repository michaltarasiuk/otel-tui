import { FocusScope } from "./focus.tsx";
import { LogsView } from "./logs/logs-view.tsx";
import { MetricsView } from "./metrics/metrics-view.tsx";
import type { Tab } from "./tabs.tsx";
import { TracesView } from "./traces/traces-view.tsx";

interface TabViewProps {
  tab: Tab;
  openTraceId: string | undefined;
  onOpenTrace: (traceId: string) => void;
  onCloseTrace: () => void;
}

export function TabView({ tab, openTraceId, onOpenTrace, onCloseTrace }: TabViewProps) {
  return (
    <>
      <box visible={tab === "traces"} flexGrow={1}>
        <FocusScope focused={tab === "traces"}>
          <TracesView
            openTraceId={openTraceId}
            onOpenTrace={(traceId) => onOpenTrace(traceId)}
            onCloseTrace={() => onCloseTrace()}
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
          <LogsView onOpenTrace={(traceId) => onOpenTrace(traceId)} />
        </FocusScope>
      </box>
    </>
  );
}
