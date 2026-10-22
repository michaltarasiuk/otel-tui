import type { ReactNode } from "react";

interface PlaceholderProps {
  children: ReactNode;
}

export function Placeholder({ children }: PlaceholderProps) {
  return (
    <box flexGrow={1} justifyContent="center" alignItems="center">
      {children}
    </box>
  );
}
