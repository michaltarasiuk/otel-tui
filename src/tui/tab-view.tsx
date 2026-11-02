import { FocusScope } from "./focus.tsx";
import { LogsView } from "./logs/logs-view.tsx";
import { MetricsView } from "./metrics/metrics-view.tsx";
import { useNavigation } from "./navigation.tsx";
import { TracesView } from "./traces/traces-view.tsx";

export function TabView() {
  const { tab } = useNavigation();

  return (
    <>
      <box visible={tab === "traces"} flexGrow={1}>
        <FocusScope focused={tab === "traces"}>
          <TracesView />
        </FocusScope>
      </box>
      <box visible={tab === "metrics"} flexGrow={1}>
        <FocusScope focused={tab === "metrics"}>
          <MetricsView />
        </FocusScope>
      </box>
      <box visible={tab === "logs"} flexGrow={1}>
        <FocusScope focused={tab === "logs"}>
          <LogsView />
        </FocusScope>
      </box>
    </>
  );
}
