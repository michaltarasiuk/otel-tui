import { type KeyEvent, type Renderable, TextAttributes } from "@opentui/core";
import type { Keymap } from "@opentui/keymap";

import { Key } from "./components/key-hints.tsx";
import { COLUMN_GAP } from "./theme/columns.ts";
import { THEME } from "./theme/theme.ts";

const HELP_KEYS_PRIORITY = 2;

export interface HelpEntry {
  key: string;
  desc: string;
}

export function activeHelp(keymap: Keymap<Renderable, KeyEvent>): HelpEntry[] {
  const keys = keymap.getActiveKeys({ includeMetadata: true });
  const described = keys.flatMap(({ display, commandAttrs: { desc } = {} }) =>
    typeof desc === "string" ? [{ display, desc }] : [],
  );
  const byDesc = Map.groupBy(described, (key) => key.desc);

  return [...byDesc].map(([desc, group]) => ({
    key: group.map((key) => key.display).join(", "),
    desc,
  }));
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
