import { Placeholder } from "./placeholder.tsx";
import type { Tab } from "./tabs.tsx";

interface TabViewProps {
  tab: Tab;
}

export function TabView({ tab }: TabViewProps) {
  switch (tab) {
    case "traces":
      return <Placeholder text="Waiting for traces..." />;
    case "metrics":
      return <Placeholder text="Waiting for metrics..." />;
    case "logs":
      return <Placeholder text="Waiting for logs..." />;
    default:
      tab satisfies never;
      throw new Error(`Unknown tab: ${String(tab)}`);
  }
}
