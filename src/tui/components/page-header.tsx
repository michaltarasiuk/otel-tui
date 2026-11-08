import type { ColorInput } from "@opentui/core";

import { COLUMN_GAP } from "#tui/theme/columns.ts";
import { THEME } from "#tui/theme/theme.ts";

import { useFocused } from "./focus.tsx";
import type { useSearch } from "./use-search.ts";

interface PageHeaderProps {
  children: React.ReactNode;
}

export function PageHeader({ children }: PageHeaderProps) {
  return (
    <box flexDirection="row" gap={COLUMN_GAP} paddingX={1}>
      {children}
    </box>
  );
}

interface SearchInputProps {
  search: ReturnType<typeof useSearch>;
  placeholder: string;
}

export function SearchInput({ search, placeholder }: SearchInputProps) {
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

interface ChipProps {
  color?: ColorInput;
  children: React.ReactNode;
}

export function Chip({ color = THEME.text, children }: ChipProps) {
  return (
    <text fg={color} flexShrink={0}>
      {children}
    </text>
  );
}

interface CountProps {
  children: string;
}

export function Count({ children }: CountProps) {
  return (
    <text fg={THEME.textMuted} flexShrink={0}>
      {children}
    </text>
  );
}
