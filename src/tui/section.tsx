import { TextAttributes } from "@opentui/core";

import { THEME } from "./theme.ts";

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <box>
      <text fg={THEME.textMuted} attributes={TextAttributes.BOLD}>
        {title}
      </text>
      {children}
    </box>
  );
}

interface ScopeSectionProps {
  name: string;
  version: string | null;
}

export function ScopeSection({ name, version }: ScopeSectionProps) {
  return (
    <Section title="Scope">
      <text fg={THEME.text}>
        {name} <span fg={THEME.textMuted}>{version}</span>
      </text>
    </Section>
  );
}
