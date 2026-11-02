import type { TabSelectOption, TabSelectRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";

import { useFocused } from "./focus.tsx";
import { useNavigation } from "./navigation.tsx";
import { THEME } from "./theme.ts";

export type Tab = (typeof TABS)[number]["value"];

const TABS = [
  { name: "Traces", description: "", value: "traces" },
  { name: "Metrics", description: "", value: "metrics" },
  { name: "Logs", description: "", value: "logs" },
] as const satisfies TabSelectOption[];

const TAB_WIDTH = 20;

export function Tabs() {
  const focused = useFocused();
  const { tab, setTab } = useNavigation();

  const tabsRef = useRef<TabSelectRenderable>(null);

  useEffect(() => {
    tabsRef.current?.setSelectedIndex(TABS.findIndex((option) => option.value === tab));
  }, [tab]);

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
          setTab(option.value);
        }
      }}
    />
  );
}
