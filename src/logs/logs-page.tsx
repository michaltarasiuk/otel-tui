import type { BoxRenderable, ScrollBoxRenderable } from "@opentui/core";
import { useDeferredValue, useRef, useState } from "react";

import { CopyKey } from "#ui/clipboard.tsx";
import { FocusScope } from "#ui/focus.tsx";
import { type HistogramRange, stepSelection } from "#ui/histogram/bars.ts";
import { timeRangeLabel } from "#ui/histogram/time-columns.ts";
import { HISTOGRAM_HEIGHT, TimeHistogram } from "#ui/histogram/time-histogram.tsx";
import { Key, KeyHints, StepKeys } from "#ui/key-hints.tsx";
import { Chip, Count, PageHeader, SearchInput } from "#ui/page-header.tsx";
import { PauseKey } from "#ui/pause.tsx";
import { Placeholder } from "#ui/placeholder.tsx";
import { ScrollKeys } from "#ui/scroll-box.tsx";
import { SearchKeys } from "#ui/search-keys.tsx";
import { Split } from "#ui/split.tsx";
import { useSearch } from "#ui/use-search.ts";
import { useSelection } from "#ui/use-selection.ts";
import { cycle, findNextIndex } from "#utils/cycle.ts";
import { formatShownCount } from "#utils/number.ts";

import { LogDetails } from "./log-details.tsx";
import { useLogs } from "./log-queries.ts";
import { LogTable } from "./log-table.tsx";
import type { Log } from "./log.ts";
import { severityColor } from "./severity-color.ts";
import { isErrorLevel } from "./severity.ts";

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
  const [minSeverity, setMinSeverity] = useState<MinSeverity>(undefined);
  const deferredMinSeverity = useDeferredValue(minSeverity);
  const [timeRange, setTimeRange] = useState<HistogramRange | undefined>(undefined);
  const deferredTimeRange = useDeferredValue(timeRange);

  const [logList, logTimeline] = useLogs({
    search: search.deferredText,
    minSeverity: deferredMinSeverity,
    traceId,
    spanId,
    timeRange: deferredTimeRange,
  });

  const { logs, totalCount } = logList.data;
  const timeline = logTimeline.data;

  const [selectedIndex, select] = useSelection(logs, (log) => log.log_id);
  const selected = logs[selectedIndex];
  const selectedTraceId = selected?.trace_id ?? null;

  const filtered =
    search.deferredText !== "" ||
    deferredMinSeverity !== undefined ||
    traceId !== undefined ||
    deferredTimeRange !== undefined;
  const browsing = !search.isEditing;

  const pageRef = useRef<BoxRenderable>(null);
  const detailsRef = useRef<ScrollBoxRenderable>(null);
  const [height, setHeight] = useState(0);

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
