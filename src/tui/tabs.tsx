import type { TabSelectOption, TabSelectRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";

import { useFocused } from "./focus.tsx";
import { THEME } from "./theme.ts";

export type Tab = (typeof TABS)[number]["value"];

const TABS = [
  { name: "Traces", description: "", value: "traces" },
  { name: "Metrics", description: "", value: "metrics" },
  { name: "Logs", description: "", value: "logs" },
] as const satisfies TabSelectOption[];

interface TabsProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

export function Tabs({ tab, onChange }: TabsProps) {
  const focused = useFocused();

  const tabsRef = useRef<TabSelectRenderable>(null);

  useEffect(() => {
    tabsRef.current?.setSelectedIndex(TABS.findIndex((option) => option.value === tab));
  }, [tab]);

  return (
    <tab-select
      ref={tabsRef}
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
