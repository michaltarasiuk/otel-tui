import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { cycle } from "../../utils/cycle.ts";
import { FocusScope, useFocused } from "../focus.tsx";
import { Placeholder } from "../placeholder.tsx";
import { LogFilterBar } from "./log-filter-bar.tsx";
import { useLogList, useLogTotalCount } from "./log-queries.ts";
import { LogTable } from "./log-table.tsx";

type MinSeverity = (typeof MIN_SEVERITIES)[number];

const MIN_SEVERITIES = [undefined, "DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const;

interface LogsViewProps {
  onOpenTrace: (traceId: string) => void;
}

export function LogsView({ onOpenTrace }: LogsViewProps) {
  const focused = useFocused();

  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [minSeverity, setMinSeverity] = useState<MinSeverity>();
  const [traceId, setTraceId] = useState<string>();

  const logList = useLogList({ search, minSeverity, traceId });
  const logTotalCount = useLogTotalCount();

  const { data: logs = [] } = logList;
  const { data: totalCount = 0 } = logTotalCount;

  const isPending = logList.isPending || logTotalCount.isPending;
  const isError = logList.isError || logTotalCount.isError;

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        {
          name: "logs.search",
          desc: "search",
          enabled: !searching,
          run() {
            setSearching(true);
          },
        },
        {
          name: "logs.apply-search",
          desc: "apply",
          enabled: searching,
          run() {
            setSearching(false);
          },
        },
        {
          name: "logs.clear-search",
          desc: "clear",
          enabled: searching || search !== "",
          run() {
            setSearch("");
            setSearching(false);
          },
        },
        {
          name: "logs.clear-trace",
          desc: "all logs",
          enabled: !searching && search === "" && traceId !== undefined,
          run() {
            setTraceId(undefined);
          },
        },
        {
          name: "logs.next-severity",
          desc: "severity",
          enabled: !searching,
          run() {
            setMinSeverity((minSeverity) => cycle(MIN_SEVERITIES, minSeverity, 1));
          },
        },
        {
          name: "logs.previous-severity",
          enabled: !searching,
          run() {
            setMinSeverity((minSeverity) => cycle(MIN_SEVERITIES, minSeverity, -1));
          },
        },
      ],
      bindings: [
        { key: "/", cmd: "logs.search" },
        { key: "return", cmd: "logs.apply-search" },
        { key: "escape", cmd: "logs.clear-search" },
        { key: "escape", cmd: "logs.clear-trace" },
        { key: "s", cmd: "logs.next-severity" },
        { key: "shift+s", cmd: "logs.previous-severity" },
      ],
    }),
    [focused, searching, search, traceId],
  );

  const filtered = search !== "" || minSeverity !== undefined || traceId !== undefined;

  function renderLogs() {
    if (isError) {
      return <Placeholder text="Failed to load logs" variant="error" />;
    }
    if (isPending || logs.length === 0) {
      return <Placeholder text={filtered ? "No logs match" : "Waiting for logs..."} />;
    }
    return (
      <FocusScope focused={!searching}>
        <LogTable
          logs={logs}
          onOpenTrace={(traceId) => onOpenTrace(traceId)}
          onToggleTrace={(selectedTraceId) =>
            setTraceId((traceId) => (traceId === selectedTraceId ? undefined : selectedTraceId))
          }
        />
      </FocusScope>
    );
  }

  return (
    <box flexGrow={1}>
      <LogFilterBar
        search={search}
        searching={searching}
        minSeverity={minSeverity}
        traceId={traceId}
        shownCount={logs.length}
        totalCount={totalCount}
        onSearchInput={(search) => setSearch(search)}
      />
      {renderLogs()}
    </box>
  );
}
