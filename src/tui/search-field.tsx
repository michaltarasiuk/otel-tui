import { useFocused } from "./focus.tsx";
import { THEME } from "./theme.ts";

interface SearchFieldProps {
  search: string;
  searching: boolean;
  placeholder: string;
  onInput: (search: string) => void;
}

export function SearchField({ search, searching, placeholder, onInput }: SearchFieldProps) {
  const focused = useFocused();

  return (
    <box flexGrow={1} flexDirection="row">
      {(searching || search !== "") && (
        <text fg={THEME.textMuted} flexShrink={0}>
          /
        </text>
      )}
      {searching ? (
        <input
          flexGrow={1}
          focused={focused}
          value={search}
          placeholder={placeholder}
          textColor={THEME.text}
          placeholderColor={THEME.textMuted}
          onInput={(search) => onInput(search)}
        />
      ) : (
        <text fg={THEME.text} wrapMode="none" truncate>
          {search}
        </text>
      )}
    </box>
  );
}
