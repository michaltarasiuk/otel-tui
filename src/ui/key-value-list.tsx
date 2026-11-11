import type { Attributes } from "#telemetry/attributes.ts";

import { COLUMN_GAP } from "./columns.ts";
import { THEME } from "./theme.ts";

const KEY_MAX_WIDTH = 32;

interface KeyValueListProps {
  entries: Attributes;
}

export function KeyValueList({ entries }: KeyValueListProps) {
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
