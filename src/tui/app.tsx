import type { ReceiverUrls } from "../db/receiver.ts";
import { COLUMN_GAP } from "./columns.ts";
import { FocusScope } from "./focus.tsx";
import { Footer } from "./footer.tsx";
import { Layout } from "./layout.tsx";
import { ReceiverStatus } from "./receiver-status.tsx";
import { TabView } from "./tab-view.tsx";
import { Tabs } from "./tabs.tsx";
import { useRegion } from "./use-region.ts";

interface AppProps {
  receiverUrls: ReceiverUrls;
}

export function App({ receiverUrls }: AppProps) {
  const region = useRegion();

  return (
    <Layout
      tabs={
        <box flexDirection="row" justifyContent="space-between" gap={COLUMN_GAP} paddingRight={1}>
          <FocusScope focused={region === "tabs"}>
            <Tabs />
          </FocusScope>
          <ReceiverStatus receiverUrls={receiverUrls} />
        </box>
      }
      footer={<Footer />}
    >
      <FocusScope focused={region === "content"}>
        <TabView />
      </FocusScope>
    </Layout>
  );
}
