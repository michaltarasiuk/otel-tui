import { COLUMN_GAP } from "#ui/columns.ts";

interface WindowProps {
  children: React.ReactNode;
}

export function Window({ children }: WindowProps) {
  return <box flexGrow={1}>{children}</box>;
}

interface TopBarProps {
  children: React.ReactNode;
}

export function TopBar({ children }: TopBarProps) {
  return (
    <box flexDirection="row" justifyContent="space-between" gap={COLUMN_GAP} paddingRight={1}>
      {children}
    </box>
  );
}
