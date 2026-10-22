import type { TabSelectOption } from "@opentui/core";

import { THEME } from "./theme.ts";

export type Tab = (typeof TABS)[number]["value"];

const TABS = [
  { name: "Traces", description: "", value: "traces" },
  { name: "Metrics", description: "", value: "metrics" },
  { name: "Logs", description: "", value: "logs" },
] as const satisfies TabSelectOption[];

interface TabsProps {
  onChange: (tab: Tab) => void;
}

export function Tabs({ onChange }: TabsProps) {
  return (
    <tab-select
      options={TABS}
      textColor={THEME.textMuted}
      selectedTextColor={THEME.text}
      selectedBackgroundColor={THEME.backgroundSelected}
      showDescription={false}
      showUnderline={false}
      onChange={(_index, option) => option && onChange(option.value)}
    />
  );
}
