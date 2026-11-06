import type { TabSelectOption, TabSelectRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";

import { useFocused } from "./components/focus.tsx";
import { Pane } from "./components/pane.tsx";
import { useNavigation } from "./navigation.tsx";
import { THEME } from "./theme/theme.ts";

const TABS = [
  { name: "Traces", description: "", value: "traces" },
  { name: "Metrics", description: "", value: "metrics" },
  { name: "Logs", description: "", value: "logs" },
] as const satisfies TabSelectOption[];
export type Tab = (typeof TABS)[number]["value"];

const TAB_WIDTH = 12;

export function Tabs() {
  const focused = useFocused();
  const { tab, setTab } = useNavigation();

  const tabsRef = useRef<TabSelectRenderable>(null);

  useEffect(() => {
    if (tabsRef.current === null) {
      return;
    }
    const selectedIndex = TABS.findIndex((option) => option.value === tab);
    tabsRef.current.setSelectedIndex(selectedIndex);
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

interface TabPaneProps {
  tab: Tab;
  children: React.ReactNode;
}

export function TabPane({ tab, children }: TabPaneProps) {
  const navigation = useNavigation();

  return <Pane visible={navigation.tab === tab}>{children}</Pane>;
}
