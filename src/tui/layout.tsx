import { COLUMN_GAP } from "./theme/columns.ts";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return <box flexGrow={1}>{children}</box>;
}

interface AppHeaderProps {
  children: React.ReactNode;
}

export function AppHeader({ children }: AppHeaderProps) {
  return (
    <box flexDirection="row" justifyContent="space-between" gap={COLUMN_GAP} paddingRight={1}>
      {children}
    </box>
  );
}

interface AppContentProps {
  children: React.ReactNode;
}

export function AppContent({ children }: AppContentProps) {
  return <box flexGrow={1}>{children}</box>;
}

interface AppFooterProps {
  children: React.ReactNode;
}

export function AppFooter({ children }: AppFooterProps) {
  return <box paddingX={1}>{children}</box>;
}
