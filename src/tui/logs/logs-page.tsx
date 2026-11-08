import type { ScrollBoxRenderable } from "@opentui/core";
import { useRef, useState } from "react";

import { CopyKey } from "#tui/clipboard.tsx";
import { FocusScope } from "#tui/components/focus.tsx";
import { Key, KeyHints, StepKeys } from "#tui/components/key-hints.tsx";
import { Chip, Count, PageHeader, SearchInput } from "#tui/components/page-header.tsx";
import { Placeholder } from "#tui/components/placeholder.tsx";
import { ScrollKeys } from "#tui/components/scroll-box.tsx";
import { SearchKeys } from "#tui/components/search-keys.tsx";
import { Split } from "#tui/components/split.tsx";
import { useSearch } from "#tui/components/use-search.ts";
import { useSelection } from "#tui/components/use-selection.ts";
import { PauseKey } from "#tui/pause.tsx";
import { findNextIndex } from "#utils/find-next-index.ts";
import { formatShownCount } from "#utils/format-shown-count.ts";
import { stepItem } from "#utils/step-item.ts";

import { LogDetails } from "./log-details.tsx";
import { useLogList, useLogTotalCount } from "./log-queries.ts";
import { LogTable } from "./log-table.tsx";
import type { Log } from "./log.ts";
import { isErrorLevel, severityColor } from "./severity.ts";

const MIN_SEVERITIES = [undefined, "DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const;
type MinSeverity = (typeof MIN_SEVERITIES)[number];

const SHORT_ID_LENGTH = 8;

function isError(log: Log) {
  return isErrorLevel(log.severity);
}

interface LogsPageProps {
  traceId: string | undefined;
  spanId: string | undefined;
  onTraceChange: (traceId: string | undefined) => void;
  onOpenTrace: (traceId: string, spanId: string | undefined) => void;
  onBack: (() => void) | undefined;
}

export function LogsPage({ traceId, spanId, onTraceChange, onOpenTrace, onBack }: LogsPageProps) {
  const search = useSearch();
  const [minSeverity, setMinSeverity] = useState<MinSeverity>();
  const detailsRef = useRef<ScrollBoxRenderable>(null);

  const logList = useLogList({ search: search.text, minSeverity, traceId, spanId });
  const logTotalCount = useLogTotalCount();

  const { data: logs = [] } = logList;
  const { data: totalCount = 0 } = logTotalCount;

  const [selectedIndex, select] = useSelection(logs, (log) => log.log_id);
  const selected = logs[selectedIndex];
  const selectedTraceId = selected?.trace_id ?? null;

  const filtered = search.text !== "" || minSeverity !== undefined || traceId !== undefined;
  const browsing = !search.isEditing;

  const isPending = logList.isPending || logTotalCount.isPending;
  const failed = logList.isError || logTotalCount.isError;

  return (
    <box flexGrow={1}>
      <PageHeader>
        <SearchInput search={search} placeholder="body, service, trace ID or key=value" />
        {traceId !== undefined && <Chip>trace {traceId.slice(0, SHORT_ID_LENGTH)}</Chip>}
        {spanId !== undefined && <Chip>span {spanId.slice(0, SHORT_ID_LENGTH)}</Chip>}
        {minSeverity !== undefined && (
          <Chip color={severityColor(minSeverity)}>≥ {minSeverity}</Chip>
        )}
        <Count>{formatShownCount(logs.length, totalCount, "log")}</Count>
      </PageHeader>
      {failed ? (
        <Placeholder text="Failed to load logs" variant="error" />
      ) : isPending || selected === undefined ? (
        <Placeholder text={filtered ? "No logs match" : "Waiting for logs..."} />
      ) : (
        <FocusScope focused={browsing}>
          <Split>
            <LogTable
              logs={logs}
              selectedIndex={selectedIndex}
              onSelect={(action) => select(action)}
            />
            <LogDetails key={selected.log_id} ref={detailsRef} log={selected} />
          </Split>
        </FocusScope>
      )}
      <KeyHints>
        <FocusScope focused={browsing}>
          {logs.some((log) => isError(log)) && (
            <StepKeys
              forward="e"
              backwardDescription="previous error"
              backward="shift+e"
              onStep={(step) =>
                select((index) => findNextIndex(logs, index, step, (log) => isError(log)))
              }
            >
              next error
            </StepKeys>
          )}
          {selectedTraceId !== null && (
            <>
              <Key
                name="return"
                onPress={() => onOpenTrace(selectedTraceId, selected?.span_id ?? undefined)}
              >
                open trace
              </Key>
              <Key
                name="t"
                onPress={() =>
                  onTraceChange(traceId === selectedTraceId ? undefined : selectedTraceId)
                }
              >
                trace
              </Key>
            </>
          )}
          {selected !== undefined && selected.body !== null && (
            <CopyKey name="y" text={selected.body}>
              copy body
            </CopyKey>
          )}
        </FocusScope>
        <SearchKeys search={search} />
        <FocusScope focused={browsing}>
          {search.text === "" && onBack !== undefined && (
            <Key name="escape" onPress={() => onBack()}>
              back
            </Key>
          )}
          {search.text === "" && onBack === undefined && traceId !== undefined && (
            <Key name="escape" onPress={() => onTraceChange(undefined)}>
              all logs
            </Key>
          )}
          <StepKeys
            forward="s"
            backwardDescription="lower severity"
            backward="shift+s"
            onStep={(step) =>
              setMinSeverity((minSeverity) => stepItem(MIN_SEVERITIES, minSeverity, step))
            }
          >
            severity
          </StepKeys>
          {selected !== undefined && <ScrollKeys target={detailsRef} />}
          <PauseKey />
        </FocusScope>
      </KeyHints>
    </box>
  );
}
