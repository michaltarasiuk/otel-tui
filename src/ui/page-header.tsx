import type { ColorInput } from "@opentui/core";

import { COLUMN_GAP } from "./columns.ts";
import { THEME } from "./theme.ts";

interface PageHeaderProps {
  children: React.ReactNode;
}

export function PageHeader({ children }: PageHeaderProps) {
  return (
    <box flexDirection="row" gap={COLUMN_GAP} paddingX={1}>
      {children}
    </box>
  );
}

interface ChipProps {
  color?: ColorInput;
  children: React.ReactNode;
}

export function Chip({ color = THEME.text, children }: ChipProps) {
  return (
    <text fg={color} flexShrink={0}>
      {children}
    </text>
  );
}

interface CountProps {
  children: string;
}

export function Count({ children }: CountProps) {
  return (
    <text fg={THEME.textMuted} flexShrink={0} marginLeft="auto">
      {children}
    </text>
  );
}
