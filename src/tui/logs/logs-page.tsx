import type { BoxRenderable, ScrollBoxRenderable } from "@opentui/core";
import { useRef, useState } from "react";

import type { Log } from "#telemetry/logs/log.ts";
import { isErrorLevel } from "#telemetry/logs/severity.ts";
import { CopyKey } from "#tui/clipboard.tsx";
import { FocusScope } from "#tui/components/focus.tsx";
import { Key, KeyHints, StepKeys } from "#tui/components/key-hints.tsx";
import { Chip, Count, PageHeader, SearchInput } from "#tui/components/page-header.tsx";
import { Placeholder } from "#tui/components/placeholder.tsx";
import { ScrollKeys } from "#tui/components/scroll-box.tsx";
import { SearchKeys } from "#tui/components/search-keys.tsx";
import { Split } from "#tui/components/split.tsx";
import { useDeferredState } from "#tui/components/use-deferred-state.ts";
import { useSearch } from "#tui/components/use-search.ts";
import { useSelection } from "#tui/components/use-selection.ts";
import { type HistogramRange, stepSelection } from "#tui/histogram/bars.ts";
import { timeRangeLabel } from "#tui/histogram/time-columns.ts";
import { HISTOGRAM_HEIGHT, TimeHistogram } from "#tui/histogram/time-histogram.tsx";
import { PauseKey } from "#tui/pause.tsx";
import { cycle, findNextIndex } from "#utils/cycle.ts";
import { formatShownCount } from "#utils/number.ts";

import { LogDetails } from "./log-details.tsx";
import { useLogs } from "./log-queries.ts";
import { LogTable } from "./log-table.tsx";
import { severityColor } from "./severity-color.ts";

const MIN_SEVERITIES = [undefined, "DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const;
type MinSeverity = (typeof MIN_SEVERITIES)[number];

const SHORT_ID_LENGTH = 8;

const PAGE_HEADER_HEIGHT = 1;
const MIN_TABLE_AND_DETAILS_HEIGHT = 12;
const KEY_HINTS_HEIGHT = 1;
const MIN_HEIGHT_FOR_HISTOGRAM =
  PAGE_HEADER_HEIGHT + HISTOGRAM_HEIGHT + MIN_TABLE_AND_DETAILS_HEIGHT + KEY_HINTS_HEIGHT;

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
  const [minSeverity, setMinSeverity] = useDeferredState<MinSeverity>(undefined);
  const [timeRange, setTimeRange] = useDeferredState<HistogramRange | undefined>(undefined);

  const pageRef = useRef<BoxRenderable>(null);
  const detailsRef = useRef<ScrollBoxRenderable>(null);
  const [height, setHeight] = useState(0);

  const [logList, logTimeline] = useLogs({
    search: search.query,
    minSeverity,
    traceId,
    spanId,
    timeRange,
  });

  const { logs, totalCount } = logList.data;
  const timeline = logTimeline.data;

  const [selectedIndex, select] = useSelection(logs, (log) => log.log_id);
  const selected = logs[selectedIndex];
  const selectedTraceId = selected?.trace_id ?? null;

  const filtered =
    search.query !== "" ||
    minSeverity !== undefined ||
    traceId !== undefined ||
    timeRange !== undefined;
  const browsing = !search.isEditing;

  return (
    <box ref={pageRef} flexGrow={1} onSizeChange={() => setHeight(pageRef.current?.height ?? 0)}>
      <PageHeader>
        <SearchInput search={search} placeholder="body, service, trace ID or key=value" />
        {traceId !== undefined && <Chip>trace {traceId.slice(0, SHORT_ID_LENGTH)}</Chip>}
        {spanId !== undefined && <Chip>span {spanId.slice(0, SHORT_ID_LENGTH)}</Chip>}
        {minSeverity !== undefined && (
          <Chip color={severityColor(minSeverity)}>≥ {minSeverity}</Chip>
        )}
        {timeRange !== undefined && <Chip>{timeRangeLabel(timeRange)}</Chip>}
        <Count>{formatShownCount(logs.length, totalCount, "log")}</Count>
      </PageHeader>
      {height >= MIN_HEIGHT_FOR_HISTOGRAM && (
        <TimeHistogram
          title="Logs over time"
          occupied={timeline.occupied}
          newestBucketMs={timeline.newestBucketMs}
          selected={timeRange}
        />
      )}
      {logList.isError ? (
        <Placeholder text="Failed to load logs" variant="error" />
      ) : selected === undefined ? (
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
          {search.text === "" && timeRange !== undefined && (
            <Key name="escape" onPress={() => setTimeRange(undefined)}>
              any time
            </Key>
          )}
          {timeline.occupied.length > 0 && (
            <StepKeys
              forward="right"
              backward="left"
              description="later range"
              backwardDescription="earlier range"
              onStep={(step) =>
                setTimeRange((range) => stepSelection(timeline.occupied, range, step))
              }
            >
              range
            </StepKeys>
          )}
          {search.text === "" && timeRange === undefined && onBack !== undefined && (
            <Key name="escape" onPress={() => onBack()}>
              back
            </Key>
          )}
          {search.text === "" &&
            timeRange === undefined &&
            onBack === undefined &&
            traceId !== undefined && (
              <Key name="escape" onPress={() => onTraceChange(undefined)}>
                all logs
              </Key>
            )}
          <StepKeys
            forward="s"
            backwardDescription="lower severity"
            backward="shift+s"
            onStep={(step) =>
              setMinSeverity((minSeverity) => cycle(MIN_SEVERITIES, minSeverity, step))
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
