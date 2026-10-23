import { useActiveKeys } from "@opentui/keymap/react";

import { THEME } from "./theme.ts";

export function KeyHints() {
  const activeKeys = useActiveKeys({ includeMetadata: true });

  return (
    <box flexDirection="row" gap={2} overflow="hidden">
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
