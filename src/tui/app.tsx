import { useState } from "react";

import type { ReceiverUrls } from "../db/receiver.ts";
import { FocusScope } from "./focus.tsx";
import { Footer } from "./footer.tsx";
import { Layout } from "./layout.tsx";
import { TabView } from "./tab-view.tsx";
import { type Tab, Tabs } from "./tabs.tsx";
import { useRegion } from "./use-region.ts";

interface AppProps {
  receiverUrls: ReceiverUrls;
}

export function App({ receiverUrls }: AppProps) {
  const [tab, setTab] = useState<Tab>("traces");
  const region = useRegion();

  return (
    <Layout
      tabs={
        <FocusScope focused={region === "tabs"}>
          <Tabs tab={tab} onChange={(tab) => setTab(tab)} />
        </FocusScope>
      }
      footer={<Footer receiverUrls={receiverUrls} />}
    >
      <FocusScope focused={region === "content"}>
        <TabView tab={tab} onTabChange={(tab) => setTab(tab)} />
      </FocusScope>
    </Layout>
  );
}
