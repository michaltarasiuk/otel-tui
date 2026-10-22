import { useActiveKeys } from "@opentui/keymap/react";

import { THEME } from "./theme.ts";

export function KeyHints() {
  const activeKeys = useActiveKeys({ includeMetadata: true });

  return (
    <box flexDirection="row" gap={2}>
      {activeKeys.map(({ display, commandAttrs }) => {
        const desc = commandAttrs?.["desc"];
        return (
          typeof desc === "string" && (
            <text key={display} fg={THEME.textMuted}>
              <span fg={THEME.text}>{display}</span> {desc}
            </text>
          )
        );
      })}
    </box>
  );
}
