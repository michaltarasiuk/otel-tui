import { useBindings } from "@opentui/keymap/react";
import { createContext, use, useEffectEvent, useId } from "react";

import { COLUMN_GAP } from "#tui/theme/columns.ts";
import { THEME } from "#tui/theme/theme.ts";

import { FocusRoot, useFocused } from "./focus.tsx";

export const AppKeys = createContext<React.ReactNode>(null);

interface KeyHintsProps {
  children: React.ReactNode;
}

export function KeyHints({ children }: KeyHintsProps) {
  return (
    <box flexDirection="row" gap={COLUMN_GAP} paddingX={1} marginTop="auto" overflow="hidden">
      {children}
      <FocusRoot>{use(AppKeys)}</FocusRoot>
    </box>
  );
}

interface KeyProps {
  name: string;
  priority?: number | undefined;
  onPress?: () => unknown;
  children?: string | undefined;
}

export function Key({ name, priority = 0, onPress, children }: KeyProps) {
  const active = useFocused();
  const bound = onPress !== undefined;

  const command = useId();
  const press = useEffectEvent(() => onPress?.());

  useBindings(
    () => ({
      enabled: active && bound,
      priority,
      commands: [
        {
          name: command,
          run() {
            return press() !== false;
          },
        },
      ],
      bindings: [{ key: name, cmd: command }],
    }),
    [active, bound, command, name, priority],
  );

  if (!active || children === undefined) {
    return null;
  }

  return (
    <text fg={THEME.textMuted} wrapMode="none" flexShrink={0}>
      <span fg={THEME.text}>{name}</span> {children}
    </text>
  );
}

interface StepKeysProps {
  forward: string;
  backward: string;
  priority?: number | undefined;
  onStep: (step: 1 | -1) => unknown;
  children?: string;
}

export function StepKeys({ forward, backward, priority, onStep, children }: StepKeysProps) {
  return (
    <>
      <Key name={forward} priority={priority} onPress={() => onStep(1)}>
        {children}
      </Key>
      <Key name={backward} priority={priority} onPress={() => onStep(-1)} />
    </>
  );
}
