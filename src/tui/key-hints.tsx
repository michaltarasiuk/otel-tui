import { useActiveKeys } from "@opentui/keymap/react";

import { COLUMN_GAP } from "./columns.ts";
import { THEME } from "./theme.ts";

export const FIRST_HINT_PRIORITY = 1;

export function KeyHints() {
  const activeKeys = useActiveKeys({ includeMetadata: true });

  return (
    <box flexDirection="row" gap={COLUMN_GAP} overflow="hidden">
      {activeKeys.map(({ display, commandAttrs }) => {
        const desc = commandAttrs?.["desc"];
        return (
          typeof desc === "string" && (
            <text key={display} fg={THEME.textMuted} wrapMode="none" flexShrink={0}>
              <span fg={THEME.text}>{display}</span> {desc}
            </text>
          )
        );
      })}
    </box>
  );
}
