import { COLUMN_GAP } from "./columns.ts";
import { useFocused } from "./focus.tsx";
import { THEME } from "./theme.ts";
import type { useSearch } from "./use-search.ts";

interface FilterBarProps {
  search: ReturnType<typeof useSearch>;
  placeholder: string;
  count: string;
  children?: React.ReactNode;
}

export function FilterBar({ search, placeholder, count, children }: FilterBarProps) {
  const focused = useFocused();

  return (
    <box flexDirection="row" gap={COLUMN_GAP} paddingX={1}>
      <box flexGrow={1} flexDirection="row">
        {(search.isEditing || search.text !== "") && (
          <text fg={THEME.textMuted} flexShrink={0}>
            /
          </text>
        )}
        {search.isEditing ? (
          <input
            flexGrow={1}
            focused={focused}
            value={search.text}
            placeholder={placeholder}
            textColor={THEME.text}
            placeholderColor={THEME.textMuted}
            onInput={(text) => search.setText(text)}
          />
        ) : (
          <text fg={THEME.text} wrapMode="none" truncate>
            {search.text}
          </text>
        )}
      </box>
      {children}
      <text fg={THEME.textMuted} flexShrink={0}>
        {count}
      </text>
    </box>
  );
}
