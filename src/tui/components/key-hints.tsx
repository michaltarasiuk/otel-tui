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
  onPress?: () => void;
  children?: string;
}

export function Key({ name, onPress, children }: KeyProps) {
  const active = useFocused();
  const bound = onPress !== undefined;

  const command = useId();
  const press = useEffectEvent(() => onPress?.());

  useBindings(
    () => ({
      enabled: active && bound,
      commands: [
        {
          name: command,
          run() {
            press();
          },
        },
      ],
      bindings: [{ key: name, cmd: command }],
    }),
    [active, bound, command, name],
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
  onStep: (step: 1 | -1) => void;
  children: string;
}

export function StepKeys({ forward, backward, onStep, children }: StepKeysProps) {
  return (
    <>
      <Key name={forward} onPress={() => onStep(1)}>
        {children}
      </Key>
      <Key name={backward} onPress={() => onStep(-1)} />
    </>
  );
}
