import { Placeholder } from "./placeholder.tsx";
import type { Tab } from "./tabs.tsx";
import { TraceList } from "./traces/trace-list.tsx";

interface TabViewProps {
  tab: Tab;
}

export function TabView({ tab }: TabViewProps) {
  switch (tab) {
    case "traces":
      return <TraceList />;
    case "metrics":
      return <Placeholder text="Waiting for metrics..." />;
    case "logs":
      return <Placeholder text="Waiting for logs..." />;
    default:
      tab satisfies never;
      throw new Error(`Unknown tab: ${tab}`);
  }
}
