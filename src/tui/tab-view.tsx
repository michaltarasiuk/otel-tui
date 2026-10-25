import { FocusScope } from "./focus.tsx";
import { Placeholder } from "./placeholder.tsx";
import type { Tab } from "./tabs.tsx";
import { TracesView } from "./traces/traces-view.tsx";

function renderPlaceholder(tab: Tab) {
  switch (tab) {
    case "traces":
      return null;
    case "metrics":
      return <Placeholder text="Waiting for metrics..." />;
    case "logs":
      return <Placeholder text="Waiting for logs..." />;
    default:
      tab satisfies never;
      throw new Error(`Unknown tab: ${tab}`);
  }
}

interface TabViewProps {
  tab: Tab;
}

export function TabView({ tab }: TabViewProps) {
  return (
    <>
      <box visible={tab === "traces"} flexGrow={1}>
        <FocusScope focused={tab === "traces"}>
          <TracesView />
        </FocusScope>
      </box>
      {renderPlaceholder(tab)}
    </>
  );
}
