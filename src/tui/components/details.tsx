import { type ColorInput, TextAttributes } from "@opentui/core";

import { COLUMN_GAP } from "#tui/theme/columns.ts";
import { THEME } from "#tui/theme/theme.ts";

interface DetailsHeaderProps {
  children: React.ReactNode;
}

export function DetailsHeader({ children }: DetailsHeaderProps) {
  return (
    <box flexDirection="row" justifyContent="space-between" gap={COLUMN_GAP}>
      {children}
    </box>
  );
}

interface TitleProps {
  color?: ColorInput;
  children: React.ReactNode;
}

export function Title({ color = THEME.text, children }: TitleProps) {
  return (
    <text flexGrow={1} flexBasis={0} fg={color} attributes={TextAttributes.BOLD}>
      {children}
    </text>
  );
}

interface IdProps {
  children: React.ReactNode;
}

export function Id({ children }: IdProps) {
  return (
    <text fg={THEME.textMuted} flexShrink={0}>
      {children}
    </text>
  );
}

interface MetaProps {
  children: React.ReactNode;
}

export function Meta({ children }: MetaProps) {
  return (
    <box flexDirection="row" gap={COLUMN_GAP} overflow="hidden">
      {children}
    </box>
  );
}

interface FactProps {
  color?: ColorInput;
  children: React.ReactNode;
}

export function Fact({ color = THEME.textMuted, children }: FactProps) {
  return (
    <text fg={color} wrapMode="none" flexShrink={0}>
      {children}
    </text>
  );
}

interface StatProps {
  label: string;
  children: React.ReactNode;
}

export function Stat({ label, children }: StatProps) {
  return (
    <text fg={THEME.textMuted} flexShrink={0}>
      {label} <span fg={THEME.text}>{children}</span>
    </text>
  );
}

interface DescriptionProps {
  color?: ColorInput;
  children: React.ReactNode;
}

export function Description({ color = THEME.textMuted, children }: DescriptionProps) {
  return <text fg={color}>{children}</text>;
}

interface ScopeNameProps {
  name: string;
  version: string | null;
}

export function ScopeName({ name, version }: ScopeNameProps) {
  return (
    <text fg={THEME.text}>
      {name} <span fg={THEME.textMuted}>{version}</span>
    </text>
  );
}
