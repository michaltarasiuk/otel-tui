import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { cycle } from "../../utils/cycle.ts";
import { formatShownCount } from "../../utils/text.ts";
import { FilterBar } from "../components/filter-bar.tsx";
import { FocusScope, useFocused } from "../components/focus.tsx";
import { Placeholder } from "../components/placeholder.tsx";
import { useSearch } from "../components/use-search.ts";
import { useNavigation } from "../navigation.tsx";
import { THEME } from "../theme/theme.ts";
import { useLogList, useLogTotalCount } from "./log-queries.ts";
import { LogTable } from "./log-table.tsx";
import { severityColor } from "./severity.ts";

const MIN_SEVERITIES = [undefined, "DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const;
type MinSeverity = (typeof MIN_SEVERITIES)[number];

const SHORT_TRACE_ID_LENGTH = 8;

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
      <FilterBar
        search={search}
        placeholder="body, attributes, service or trace ID"
        count={formatShownCount(logs.length, totalCount, "log")}
      >
        {traceId !== undefined && (
          <text fg={THEME.text} flexShrink={0}>
            trace {traceId.slice(0, SHORT_TRACE_ID_LENGTH)}
          </text>
        )}
        {minSeverity !== undefined && (
          <text fg={severityColor(minSeverity)} flexShrink={0}>
            ≥ {minSeverity}
          </text>
        )}
      </FilterBar>
      {renderLogs()}
    </box>
  );
}
