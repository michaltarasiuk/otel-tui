import { createContext, use } from "react";

import type { Step } from "#utils/cycle.ts";

const FocusContext = createContext(true);
const FocusRequestContext = createContext(() => {});

interface RegionLevel {
  depth: number;
  stepOut?: ((step: Step) => void) | undefined;
}

const RegionLevelContext = createContext<RegionLevel>({ depth: 0 });

interface FocusScopeProps {
  focused: boolean;
  onFocusRequest?: () => void;
  onStepOut?: (step: Step) => void;
  children: React.ReactNode;
}

export function FocusScope({ focused, onFocusRequest, onStepOut, children }: FocusScopeProps) {
  const parentFocused = useFocused();
  const requestParentFocus = useFocusRequest();
  const parentLevel = useRegionLevel();

  return (
    <FocusContext value={parentFocused && focused}>
      <FocusRequestContext
        value={() => {
          requestParentFocus();
          onFocusRequest?.();
        }}
      >
        <RegionLevelContext
          value={
            onStepOut === undefined
              ? parentLevel
              : { depth: parentLevel.depth + 1, stepOut: onStepOut }
          }
        >
          {children}
        </RegionLevelContext>
      </FocusRequestContext>
    </FocusContext>
  );
}

export function useFocused() {
  return use(FocusContext);
}

export function useFocusRequest() {
  return use(FocusRequestContext);
}

export function useRegionLevel() {
  return use(RegionLevelContext);
}

interface FocusRootProps {
  children: React.ReactNode;
}

export function FocusRoot({ children }: FocusRootProps) {
  return (
    <FocusContext value>
      <RegionLevelContext value={{ depth: 0 }}>{children}</RegionLevelContext>
    </FocusContext>
  );
}

const KeysContext = createContext(true);

interface KeysScopeProps {
  enabled: boolean;
  children: React.ReactNode;
}

export function KeysScope({ enabled, children }: KeysScopeProps) {
  return <KeysContext value={useKeysEnabled() && enabled}>{children}</KeysContext>;
}

export function useKeysEnabled() {
  return use(KeysContext);
}
