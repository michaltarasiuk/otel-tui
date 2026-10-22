interface LayoutProps {
  children: React.ReactNode;
  tabs: React.ReactNode;
  footer: React.ReactNode;
}

export function Layout({ children, tabs, footer }: LayoutProps) {
  return (
    <box flexGrow={1}>
      {tabs}
      <box flexGrow={1}>{children}</box>
      {footer}
    </box>
  );
}
