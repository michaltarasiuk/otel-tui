import type { Attributes } from "#tui/query/attributes.ts";
import { COLUMN_GAP } from "#tui/theme/columns.ts";
import { THEME } from "#tui/theme/theme.ts";

const KEY_MAX_WIDTH = 32;

interface EntryListProps {
  entries: Attributes;
}

export function EntryList({ entries }: EntryListProps) {
  const longestKey = Math.max(...entries.map(({ key }) => key.length));
  const keyWidth = Math.min(KEY_MAX_WIDTH, longestKey);

  return entries.map(({ key, value }) => (
    <box key={key} flexDirection="row" gap={COLUMN_GAP}>
      <text width={keyWidth} fg={THEME.textMuted} wrapMode="none" truncate>
        {key}
      </text>
      <text flexGrow={1} flexBasis={0} fg={THEME.text}>
        {value ?? "null"}
      </text>
    </box>
  ));
}
