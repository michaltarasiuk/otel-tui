import type { TabSelectOption } from "@opentui/core";
import { THEME } from "./theme.ts";

export interface AppProps {
  receiverUrl: string;
}

export function App({ receiverUrl }: AppProps) {
  return <Layout footer={<Footer receiverUrl={receiverUrl} />}>{null}</Layout>;
}

export interface LayoutProps {
  children: React.ReactNode;
  footer: React.ReactNode;
}

function Layout({ children, footer }: LayoutProps) {
  return (
    <box flexGrow={1}>
      <Tabs />
      <box flexGrow={1}>{children}</box>
      {footer}
    </box>
  );
}

function Tabs() {
  return (
    <tab-select
      options={TABS}
      tabWidth={20}
      textColor={THEME.textMuted}
      selectedTextColor={THEME.text}
      selectedBackgroundColor={THEME.backgroundSelected}
      showDescription={false}
    />
  );
}

interface FooterProps {
  receiverUrl: string;
}

function Footer({ receiverUrl }: FooterProps) {
  return (
    <text fg={THEME.textMuted}>Listening for OTLP/HTTP on {receiverUrl}</text>
  );
}

const TABS = [
  { name: "Traces", description: "" },
  { name: "Metrics", description: "" },
  { name: "Logs", description: "" },
] satisfies TabSelectOption[];
