import type { TabSelectOption, TabSelectRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";

import { useFocused } from "./components/focus.tsx";
import { Pane } from "./components/pane.tsx";
import { type Tab, useNavigation } from "./navigation.tsx";
import { THEME } from "./theme/theme.ts";

const TAB_WIDTH = 12;

export interface TabOption extends TabSelectOption {
  value: Tab;
}

interface TabsProps {
  tabs: TabOption[];
}

export function Tabs({ tabs }: TabsProps) {
  const focused = useFocused();
  const { tab, setTab } = useNavigation();

  const tabsRef = useRef<TabSelectRenderable>(null);

  useEffect(() => {
    if (tabsRef.current === null) {
      return;
    }
    const selectedIndex = tabs.findIndex((option) => option.value === tab);
    tabsRef.current.setSelectedIndex(selectedIndex);
  }, [tabs, tab]);

  return (
    <tab-select
      ref={tabsRef}
      focused={focused}
      options={tabs}
      tabWidth={TAB_WIDTH}
      width={tabs.length * TAB_WIDTH}
      flexShrink={0}
      textColor={THEME.textMuted}
      selectedTextColor={THEME.text}
      selectedBackgroundColor={focused ? THEME.backgroundSelected : THEME.background}
      showDescription={false}
      showUnderline={false}
      onChange={(index) => {
        const option = tabs[index];
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
