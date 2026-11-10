import { useBindings } from "@opentui/keymap/react";
import { createContext, use, useEffectEvent, useId } from "react";

import { COLUMN_GAP } from "#tui/theme/columns.ts";
import { THEME } from "#tui/theme/theme.ts";

import { FocusRoot, useFocused, useKeysEnabled } from "./focus.tsx";

export const AppKeys = createContext<React.ReactNode>(null);

interface KeyHintsProps {
  children?: React.ReactNode;
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
  description?: string | undefined;
  onPress: () => void;
  children?: string | undefined;
}

export function Key({ name, priority = 0, description, onPress, children }: KeyProps) {
  const focused = useFocused();
  const keysEnabled = useKeysEnabled();
  const command = useId();
  const press = useEffectEvent(() => onPress());

  const desc = description ?? children;

  useBindings(
    () => ({
      enabled: focused && keysEnabled,
      priority,
      commands: [{ name: command, ...(desc === undefined ? {} : { desc }), run: () => press() }],
      bindings: [{ key: name, cmd: command }],
    }),
    [focused, keysEnabled, priority, command, desc, name],
  );

  if (!focused || children === undefined) {
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
  description?: string;
  backwardDescription: string;
  onStep: (step: 1 | -1) => void;
  children?: string;
}

export function StepKeys({
  forward,
  backward,
  priority,
  description,
  backwardDescription,
  onStep,
  children,
}: StepKeysProps) {
  return (
    <>
      <Key name={forward} priority={priority} description={description} onPress={() => onStep(1)}>
        {children}
      </Key>
      <Key
        name={backward}
        priority={priority}
        description={backwardDescription}
        onPress={() => onStep(-1)}
      />
    </>
  );
}
