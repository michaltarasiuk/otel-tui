import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { Footer } from "./footer.tsx";
import { Layout } from "./layout.tsx";
import { TabView } from "./tab-view.tsx";
import { type Tab, Tabs } from "./tabs.tsx";

type Region = (typeof REGIONS)[number];

const REGIONS = ["tabs", "content"] as const;

export interface AppProps {
  receiverUrl: string;
}

export function App({ receiverUrl }: AppProps) {
  const [tab, setTab] = useState<Tab>("traces");
  const [region, setRegion] = useState<Region>("tabs");

  useBindings(() => ({
    commands: [
      {
        name: "focus.next",
        run() {
          setRegion((region) => REGIONS[(REGIONS.indexOf(region) + 1) % REGIONS.length]!);
        },
      },
      {
        name: "focus.previous",
        run() {
          setRegion(
            (region) => REGIONS[(REGIONS.indexOf(region) - 1 + REGIONS.length) % REGIONS.length]!,
          );
        },
      },
    ],
    bindings: [
      { key: "tab", cmd: "focus.next" },
      { key: "shift+tab", cmd: "focus.previous" },
    ],
  }));

  return (
    <Layout
      tabs={<Tabs focused={region === "tabs"} onChange={(tab) => setTab(tab)} />}
      footer={<Footer receiverUrl={receiverUrl} />}
    >
      <TabView tab={tab} focused={region === "content"} />
    </Layout>
  );
}
