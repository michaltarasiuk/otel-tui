import { useFocused } from "./focus.tsx";
import { THEME } from "./theme.ts";
import type { useSearch } from "./use-search.ts";

interface SearchFieldProps {
  search: ReturnType<typeof useSearch>;
  placeholder: string;
}

export function SearchField({ search, placeholder }: SearchFieldProps) {
  const focused = useFocused();

  return (
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
  );
}
