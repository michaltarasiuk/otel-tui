import { useFocus } from "./focus.tsx";
import { THEME } from "./theme.ts";
import type { Search } from "./use-search.ts";

const EDITING_MIN_WIDTH = 24;

interface SearchInputProps {
  search: Search;
  placeholder: string;
}

export function SearchInput({ search, placeholder }: SearchInputProps) {
  const { focused } = useFocus();

  if (!search.isEditing && search.text === "") {
    return null;
  }

  return (
    <box
      flexDirection="row"
      flexGrow={search.isEditing ? 1 : 0}
      flexBasis={search.isEditing ? 0 : "auto"}
      flexShrink={0}
      minWidth={search.isEditing ? EDITING_MIN_WIDTH : 0}
    >
      <text fg={THEME.textMuted} flexShrink={0}>
        /
      </text>
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
        <text fg={THEME.text} wrapMode="none" flexShrink={0}>
          {search.text}
        </text>
      )}
    </box>
  );
}
