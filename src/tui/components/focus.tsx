import { createContext, use } from "react";

const FocusContext = createContext(true);
const FocusRequestContext = createContext(() => {});

interface FocusScopeProps {
  focused: boolean;
  onFocusRequest?: () => void;
  children: React.ReactNode;
}

export function FocusScope({ focused, onFocusRequest, children }: FocusScopeProps) {
  const parentFocused = useFocused();
  const requestParentFocus = useFocusRequest();

  return (
    <FocusContext value={parentFocused && focused}>
      <FocusRequestContext
        value={() => {
          requestParentFocus();
          onFocusRequest?.();
        }}
      >
        {children}
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

interface FocusRootProps {
  children: React.ReactNode;
}

export function FocusRoot({ children }: FocusRootProps) {
  return <FocusContext value>{children}</FocusContext>;
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
