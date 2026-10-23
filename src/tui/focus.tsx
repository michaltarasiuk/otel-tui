import { createContext, use } from "react";

const FocusContext = createContext(true);

interface FocusScopeProps {
  focused: boolean;
  children: React.ReactNode;
}

export function FocusScope({ focused, children }: FocusScopeProps) {
  const parentFocused = useFocused();

  return <FocusContext value={parentFocused && focused}>{children}</FocusContext>;
}

export function useFocused() {
  return use(FocusContext);
}
