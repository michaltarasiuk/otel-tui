import { COLUMN_GAP } from "./theme/columns.ts";

interface WindowProps {
  children: React.ReactNode;
}

export function Window({ children }: WindowProps) {
  return <box flexGrow={1}>{children}</box>;
}

interface WindowHeaderProps {
  children: React.ReactNode;
}

export function WindowHeader({ children }: WindowHeaderProps) {
  return (
    <box flexDirection="row" justifyContent="space-between" gap={COLUMN_GAP} paddingRight={1}>
      {children}
    </box>
  );
}

interface WindowContentProps {
  children: React.ReactNode;
}

export function WindowContent({ children }: WindowContentProps) {
  return <box flexGrow={1}>{children}</box>;
}

interface WindowFooterProps {
  children: React.ReactNode;
}

export function WindowFooter({ children }: WindowFooterProps) {
  return <box paddingX={1}>{children}</box>;
}
