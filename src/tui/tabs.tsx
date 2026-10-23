import type { TabSelectOption } from "@opentui/core";

import { useFocused } from "./focus.tsx";
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
  const focused = useFocused();

  return (
    <tab-select
      focused={focused}
      options={TABS}
      textColor={THEME.textMuted}
      selectedTextColor={THEME.text}
      selectedBackgroundColor={focused ? THEME.backgroundSelected : THEME.background}
      showDescription={false}
      showUnderline={false}
      onChange={(_index, option) => option && onChange(option.value)}
    />
  );
}
