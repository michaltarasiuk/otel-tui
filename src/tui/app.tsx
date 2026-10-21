import type { TabSelectOption } from "@opentui/core";
import { useState } from "react";
import { THEME } from "./theme.ts";

export interface AppProps {
  receiverUrl: string;
}

export function App({ receiverUrl }: AppProps) {
  const [tab, setTab] = useState<Tab>("traces");

  return (
    <Layout
      tabs={<Tabs onChange={(tab) => setTab(tab)} />}
      footer={<Footer receiverUrl={receiverUrl} />}
    >
      <TabView tab={tab} />
    </Layout>
  );
}

export interface LayoutProps {
  children: React.ReactNode;
  tabs: React.ReactNode;
  footer: React.ReactNode;
}

function Layout({ children, tabs, footer }: LayoutProps) {
  return (
    <box flexGrow={1}>
      {tabs}
      <box flexGrow={1}>{children}</box>
      {footer}
    </box>
  );
}

interface TabsProps {
  onChange: (tab: Tab) => void;
}

function Tabs({ onChange }: TabsProps) {
  return (
    <tab-select
      focused
      options={TABS}
      tabWidth={20}
      textColor={THEME.textMuted}
      selectedTextColor={THEME.text}
      selectedBackgroundColor={THEME.backgroundSelected}
      showDescription={false}
      onChange={(_index, option) => option && onChange(option.value)}
    />
  );
}

interface TabViewProps {
  tab: Tab;
}

function TabView({ tab }: TabViewProps) {
  switch (tab) {
    case "traces":
      return <Placeholder text="Waiting for traces..." />;
    case "metrics":
      return <Placeholder text="Waiting for metrics..." />;
    case "logs":
      return <Placeholder text="Waiting for logs..." />;
    default:
      tab satisfies never;
      throw new Error(`Unknown tab: ${String(tab)}`);
  }
}

interface PlaceholderProps {
  text: string;
}

function Placeholder({ text }: PlaceholderProps) {
  return (
    <box flexGrow={1} justifyContent="center" alignItems="center">
      <text fg={THEME.textMuted}>{text}</text>
    </box>
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

type Tab = (typeof TABS)[number]["value"];

const TABS = [
  { name: "Traces", description: "", value: "traces" },
  { name: "Metrics", description: "", value: "metrics" },
  { name: "Logs", description: "", value: "logs" },
] as const satisfies TabSelectOption[];
