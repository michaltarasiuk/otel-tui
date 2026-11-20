import { createContext, use } from "react";

import type { Step } from "#utils/cycle.ts";

interface Focus {
  focused: boolean;
  keysEnabled: boolean;
  requestFocus: () => void;
  depth: number;
  stepOut?: ((step: Step) => void) | undefined;
}

const FocusContext = createContext<Focus>({
  focused: true,
  keysEnabled: true,
  requestFocus: () => {},
  depth: 0,
});

export function useFocus() {
  return use(FocusContext);
}

interface FocusScopeProps {
  focused: boolean;
  onFocusRequest?: () => void;
  onStepOut?: (step: Step) => void;
  children: React.ReactNode;
}

export function FocusScope({ focused, onFocusRequest, onStepOut, children }: FocusScopeProps) {
  const parent = useFocus();

  return (
    <FocusContext
      value={{
        ...parent,
        focused: parent.focused && focused,
        requestFocus: () => {
          parent.requestFocus();
          onFocusRequest?.();
        },
        ...(onStepOut === undefined ? {} : { depth: parent.depth + 1, stepOut: onStepOut }),
      }}
    >
      {children}
    </FocusContext>
  );
}

interface FocusRootProps {
  children: React.ReactNode;
}

export function FocusRoot({ children }: FocusRootProps) {
  const parent = useFocus();

  return (
    <FocusContext value={{ ...parent, focused: true, depth: 0, stepOut: undefined }}>
      {children}
    </FocusContext>
  );
}

interface KeysScopeProps {
  enabled: boolean;
  children: React.ReactNode;
}

export function KeysScope({ enabled, children }: KeysScopeProps) {
  const parent = useFocus();

  return (
    <FocusContext value={{ ...parent, keysEnabled: parent.keysEnabled && enabled }}>
      {children}
    </FocusContext>
  );
}
