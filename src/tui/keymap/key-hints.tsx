import type { ActiveKey } from "@opentui/keymap";
import { useActiveKeys } from "@opentui/keymap/react";

import { THEME } from "../theme.ts";

const KEY_SYMBOLS: Record<string, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  return: "⏎",
  escape: "esc",
};

export function KeyHints() {
  const activeKeys = useActiveKeys({ includeMetadata: true });
  const hints = groupByDescription(activeKeys);

  return (
    <text flexShrink={0} wrapMode="none" truncate>
      {hints.map(([desc, keys], index) => (
        <span key={desc} fg={THEME.textMuted}>
          {index > 0 ? " · " : null}
          <span fg={THEME.text}>{keys.join("/")}</span> {desc}
        </span>
      ))}
    </text>
  );
}

function groupByDescription(activeKeys: readonly ActiveKey[]) {
  const groups = new Map<string, string[]>();
  for (const activeKey of activeKeys) {
    const desc = activeKey.bindingAttrs?.["desc"];
    if (typeof desc !== "string") continue;
    const keys = groups.get(desc) ?? [];
    keys.push(formatKey(activeKey.display));
    groups.set(desc, keys);
  }
  return [...groups];
}

function formatKey(display: string) {
  const shifted = /^shift\+([a-z])$/.exec(display)?.[1];
  return shifted?.toUpperCase() ?? KEY_SYMBOLS[display] ?? display;
}
