import { TextAttributes } from "@opentui/core";
import type { useKeymap } from "@opentui/keymap/react";

import { Key } from "./components/key-hints.tsx";
import { COLUMN_GAP } from "./theme/columns.ts";
import { THEME } from "./theme/theme.ts";

const HELP_KEYS_PRIORITY = 2;

export interface HelpEntry {
  key: string;
  desc: string;
}

export function activeHelp(keymap: ReturnType<typeof useKeymap>): HelpEntry[] {
  const keysByDesc = keymap
    .getActiveKeys({ includeMetadata: true })
    .reduce((acc, { display, commandAttrs: { desc } = {} }) => {
      if (typeof desc === "string") {
        acc.getOrInsert(desc, []).push(display);
      }
      return acc;
    }, new Map<string, string[]>());

  return [...keysByDesc].map(([desc, keys]) => ({ key: keys.join(", "), desc }));
}

interface HelpProps {
  entries: HelpEntry[];
  onClose: () => void;
}

export function Help({ entries, onClose }: HelpProps) {
  const keyWidth = Math.max(...entries.map(({ key }) => key.length));

  return (
    <box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      justifyContent="center"
      alignItems="center"
    >
      <box
        border
        borderColor={THEME.textMuted}
        backgroundColor={THEME.backgroundOverlay}
        paddingX={1}
      >
        <text fg={THEME.text} attributes={TextAttributes.BOLD}>
          Keys
        </text>
        <box>
          {entries.map(({ key, desc }) => (
            <box key={key} flexDirection="row" gap={COLUMN_GAP}>
              <text width={keyWidth} fg={THEME.text} flexShrink={0}>
                {key}
              </text>
              <text fg={THEME.textMuted} wrapMode="none">
                {desc}
              </text>
            </box>
          ))}
        </box>
        <box flexDirection="row" gap={COLUMN_GAP}>
          <Key name="escape" priority={HELP_KEYS_PRIORITY} onPress={() => onClose()}>
            close
          </Key>
          <Key name="?" priority={HELP_KEYS_PRIORITY} onPress={() => onClose()} />
        </box>
      </box>
    </box>
  );
}
