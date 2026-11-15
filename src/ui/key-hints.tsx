import { useBindings } from "@opentui/keymap/react";
import { createContext, type SetStateAction, use, useEffectEvent, useId } from "react";

import { cycle } from "#utils/cycle.ts";
import type { Sort } from "#utils/sort.ts";

import { COLUMN_GAP } from "./columns.ts";
import { FocusRoot, useFocused, useKeysEnabled } from "./focus.tsx";
import { THEME } from "./theme.ts";

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
      commands: [
        {
          name: command,
          ...(desc === undefined ? {} : { desc }),
          run: () => {
            press();
          },
        },
      ],
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
  description?: string | undefined;
  backwardDescription: string;
  onStep: (step: 1 | -1) => void;
  children?: string | undefined;
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

interface ListKeysProps {
  description: string;
  backwardDescription: string;
  onStep: (step: 1 | -1) => void;
}

export function ListKeys({ description, backwardDescription, onStep }: ListKeysProps) {
  return (
    <>
      <StepKeys
        forward="down"
        backward="up"
        description={description}
        backwardDescription={backwardDescription}
        onStep={(step) => onStep(step)}
      />
      <StepKeys
        forward="j"
        backward="k"
        description={description}
        backwardDescription={backwardDescription}
        onStep={(step) => onStep(step)}
      />
    </>
  );
}

interface SortKeysProps<C> {
  columns: readonly [C, ...C[]];
  ascending?: readonly NoInfer<C>[];
  onChange: (action: SetStateAction<Sort<C>>) => void;
}

export function SortKeys<C>({ columns, ascending = [], onChange }: SortKeysProps<C>) {
  function next({ column }: Sort<C>) {
    const nextColumn = cycle(columns, column, 1);
    return { column: nextColumn, descending: !ascending.includes(nextColumn) };
  }

  return (
    <>
      <Key name="o" onPress={() => onChange((sort) => next(sort))}>
        sort
      </Key>
      <Key
        name="shift+o"
        onPress={() => onChange((sort) => ({ ...sort, descending: !sort.descending }))}
      >
        reverse
      </Key>
    </>
  );
}
