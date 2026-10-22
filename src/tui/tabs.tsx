import type { TabSelectOption } from "@opentui/core";

import { THEME } from "./theme.ts";

export type Tab = (typeof TABS)[number]["value"];

const TABS = [
  { name: "Traces", description: "", value: "traces" },
  { name: "Metrics", description: "", value: "metrics" },
  { name: "Logs", description: "", value: "logs" },
] as const satisfies TabSelectOption[];

interface TabsProps {
  focused: boolean;
  onChange: (tab: Tab) => void;
}

export function Tabs({ focused, onChange }: TabsProps) {
  return (
    <tab-select
      focused={focused}
      options={TABS}
      textColor={THEME.textMuted}
      selectedTextColor={THEME.text}
      selectedBackgroundColor={focused ? THEME.backgroundSelected : "transparent"}
      showDescription={false}
      showUnderline={false}
      onChange={(_index, option) => option && onChange(option.value)}
    />
  );
}
