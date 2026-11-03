import { LogsView } from "./logs/logs-view.tsx";
import { MetricsView } from "./metrics/metrics-view.tsx";
import { useNavigation } from "./navigation.tsx";
import { Pane } from "./pane.tsx";
import { TracesView } from "./traces/traces-view.tsx";

export function TabView() {
  const { tab } = useNavigation();

  return (
    <>
      <Pane visible={tab === "traces"}>
        <TracesView />
      </Pane>
      <Pane visible={tab === "metrics"}>
        <MetricsView />
      </Pane>
      <Pane visible={tab === "logs"}>
        <LogsView />
      </Pane>
    </>
  );
}
