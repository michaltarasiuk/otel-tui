import { THEME } from "../theme.ts";

interface Tab<T extends string> {
  id: T;
  title: string;
}

interface TabSelectProps<T extends string> {
  tabs: readonly Tab<T>[];
  onChange: (id: T) => void;
}

export function TabSelect<T extends string>({ tabs, onChange }: TabSelectProps<T>) {
  return (
    <tab-select
      options={tabs.map(({ title }) => ({ name: title, description: "" }))}
      tabWidth={12}
      textColor={THEME.textMuted}
      selectedTextColor={THEME.text}
      selectedBackgroundColor={THEME.backgroundSelected}
      showDescription={false}
      showUnderline={false}
      showScrollArrows={false}
      onChange={(index) => {
        const tab = tabs[index];
        if (tab !== undefined) onChange(tab.id);
      }}
    />
  );
}
