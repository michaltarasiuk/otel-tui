import { FocusScope } from "./focus.tsx";
import { LogsView } from "./logs/logs-view.tsx";
import { Placeholder } from "./placeholder.tsx";
import type { Tab } from "./tabs.tsx";
import { TracesView } from "./traces/traces-view.tsx";

function renderPlaceholder(tab: Tab) {
  switch (tab) {
    case "traces":
    case "logs":
      return null;
    case "metrics":
      return <Placeholder text="Waiting for metrics..." />;
    default:
      tab satisfies never;
      throw new Error(`Unknown tab: ${tab}`);
  }
}

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
      <box visible={tab === "logs"} flexGrow={1}>
        <FocusScope focused={tab === "logs"}>
          <LogsView onOpenTrace={(traceId) => onOpenTrace(traceId)} />
        </FocusScope>
      </box>
      {renderPlaceholder(tab)}
    </>
  );
}
