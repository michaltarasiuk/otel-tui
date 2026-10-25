import type { Attributes } from "./attributes.ts";
import { COLUMN_GAP } from "./columns.ts";
import { IGNORE_CONTENT_SIZE } from "./flex.ts";
import { THEME } from "./theme.ts";

const KEY_MAX_WIDTH = 32;

interface EntryListProps {
  entries: Attributes;
}

export function EntryList({ entries }: EntryListProps) {
  const keyWidth = Math.min(KEY_MAX_WIDTH, Math.max(...entries.map(({ key }) => key.length)));

  return entries.map(({ key, value }) => (
    <box key={key} flexDirection="row" gap={COLUMN_GAP}>
      <text width={keyWidth} fg={THEME.textMuted} wrapMode="none" truncate>
        {key}
      </text>
      <text flexGrow={1} flexBasis={IGNORE_CONTENT_SIZE} fg={THEME.text}>
        {value ?? "null"}
      </text>
    </box>
  ));
}
