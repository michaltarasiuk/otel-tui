import { useState } from "react";

import { Footer } from "./footer.tsx";
import { Layout } from "./layout.tsx";
import { TabView } from "./tab-view.tsx";
import { type Tab, Tabs } from "./tabs.tsx";

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
