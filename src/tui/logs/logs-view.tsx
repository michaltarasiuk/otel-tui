import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { cycle } from "../../utils/cycle.ts";
import { FocusScope, useFocused } from "../focus.tsx";
import { useNavigation } from "../navigation.tsx";
import { Placeholder } from "../placeholder.tsx";
import { useSearch } from "../use-search.ts";
import { LogFilterBar } from "./log-filter-bar.tsx";
import { useLogList, useLogTotalCount } from "./log-queries.ts";
import { LogTable } from "./log-table.tsx";

type MinSeverity = (typeof MIN_SEVERITIES)[number];

const MIN_SEVERITIES = [undefined, "DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const;

export function LogsView() {
  const focused = useFocused();
  const { logsTraceId: traceId, canGoBack, setLogsTraceId, goBack } = useNavigation();

  const search = useSearch();
  const [minSeverity, setMinSeverity] = useState<MinSeverity>();

  const logList = useLogList({ search: search.text, minSeverity, traceId });
  const logTotalCount = useLogTotalCount();

  const { data: logs = [] } = logList;
  const { data: totalCount = 0 } = logTotalCount;

  const isPending = logList.isPending || logTotalCount.isPending;
  const isError = logList.isError || logTotalCount.isError;

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        ...search.commands,
        {
          name: "logs.back",
          desc: "back",
          enabled: !search.isEditing && search.text === "" && canGoBack,
          run() {
            goBack();
          },
        },
        {
          name: "logs.clear-trace",
          desc: "all logs",
          enabled: !search.isEditing && search.text === "" && !canGoBack && traceId !== undefined,
          run() {
            setLogsTraceId(undefined);
          },
        },
        {
          name: "logs.next-severity",
          desc: "severity",
          enabled: !search.isEditing,
          run() {
            setMinSeverity((minSeverity) => cycle(MIN_SEVERITIES, minSeverity, 1));
          },
        },
        {
          name: "logs.previous-severity",
          enabled: !search.isEditing,
          run() {
            setMinSeverity((minSeverity) => cycle(MIN_SEVERITIES, minSeverity, -1));
          },
        },
      ],
      bindings: [
        ...search.bindings,
        { key: "escape", cmd: "logs.back" },
        { key: "escape", cmd: "logs.clear-trace" },
        { key: "s", cmd: "logs.next-severity" },
        { key: "shift+s", cmd: "logs.previous-severity" },
      ],
    }),
    [focused, search, traceId, canGoBack, setLogsTraceId, goBack],
  );

  const filtered = search.text !== "" || minSeverity !== undefined || traceId !== undefined;

  function renderLogs() {
    if (isError) {
      return <Placeholder text="Failed to load logs" variant="error" />;
    }
    if (isPending || logs.length === 0) {
      return <Placeholder text={filtered ? "No logs match" : "Waiting for logs..."} />;
    }
    return (
      <FocusScope focused={!search.isEditing}>
        <LogTable logs={logs} />
      </FocusScope>
    );
  }

  return (
    <box flexGrow={1}>
      <LogFilterBar
        search={search}
        minSeverity={minSeverity}
        traceId={traceId}
        shownCount={logs.length}
        totalCount={totalCount}
      />
      {renderLogs()}
    </box>
  );
}
