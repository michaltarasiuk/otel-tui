import { useTerminalDimensions } from "@opentui/react";
import { createContext, use } from "react";

export interface Size {
  width: number;
  height: number | undefined;
}

const SizeContext = createContext<Size | undefined>(undefined);

interface SizeProviderProps {
  value: Size;
  children: React.ReactNode;
}

export function SizeProvider({ value, children }: SizeProviderProps) {
  return <SizeContext value={value}>{children}</SizeContext>;
}

export function useRegionSize(): Size {
  const terminal = useTerminalDimensions();
  return use(SizeContext) ?? terminal;
}
