import type { TabSelectOption, TabSelectRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";

import { useFocused } from "./components/focus.tsx";
import type { Tab } from "./pages.ts";
import { THEME } from "./theme/theme.ts";

const TAB_WIDTH = 12;

interface TabOption extends TabSelectOption {
  value: Tab;
}

const TABS = [
  { name: "Traces", description: "", value: "traces" },
  { name: "Metrics", description: "", value: "metrics" },
  { name: "Logs", description: "", value: "logs" },
] as const satisfies TabOption[];

interface TabsProps {
  current: Tab;
  onSelect: (tab: Tab) => void;
}

export function Tabs({ current, onSelect }: TabsProps) {
  const focused = useFocused();

  const tabsRef = useRef<TabSelectRenderable>(null);

  useEffect(() => {
    tabsRef.current?.setSelectedIndex(TABS.findIndex((option) => option.value === current));
  }, [current]);

  return (
    <tab-select
      ref={tabsRef}
      focused={focused}
      options={TABS}
      tabWidth={TAB_WIDTH}
      width={TABS.length * TAB_WIDTH}
      flexShrink={0}
      textColor={THEME.textMuted}
      selectedTextColor={THEME.text}
      selectedBackgroundColor={focused ? THEME.backgroundSelected : THEME.background}
      showDescription={false}
      showUnderline={false}
      onChange={(index) => {
        const option = TABS[index];
        if (option !== undefined) {
          onSelect(option.value);
        }
      }}
    />
  );
}
