import { useSuspenseQueries } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";

import { useConnection } from "#query/connection.ts";
import { CopyKey } from "#ui/clipboard.tsx";
import { FocusScope } from "#ui/focus.tsx";
import { timeRangeLabel } from "#ui/histogram/time-columns.ts";
import { HISTOGRAM_HEIGHT, TimeHistogram } from "#ui/histogram/time-histogram.tsx";
import { useTimeRange } from "#ui/histogram/use-time-range.ts";
import { Key, KeyHints, SortKeys, StepKeys } from "#ui/key-hints.tsx";
import { Chip, Count, PageHeader, SearchInput } from "#ui/page-header.tsx";
import { PauseKey } from "#ui/pause.tsx";
import { Placeholder } from "#ui/placeholder.tsx";
import { SearchKeys } from "#ui/search-keys.tsx";
import { ServiceName } from "#ui/service-name.tsx";
import { useRegionSize } from "#ui/size.tsx";
import { THEME } from "#ui/theme.ts";
import { useSearch } from "#ui/use-search.ts";
import { useSelection } from "#ui/use-selection.ts";
import { findNextIndex } from "#utils/cycle.ts";
import { formatShownCount } from "#utils/number.ts";
import { formatDuration } from "#utils/time.ts";

import { traceListQuery, traceTimelineQuery } from "./trace-queries.ts";
import { TraceTable } from "./trace-table.tsx";
import { TRACE_SORT_COLUMNS, type Trace, type TraceSort } from "./trace.ts";

const PAGE_HEADER_HEIGHT = 1;
const MIN_TABLE_HEIGHT = 6;
const KEY_HINTS_HEIGHT = 1;
const MIN_HEIGHT_FOR_HISTOGRAM =
  PAGE_HEADER_HEIGHT + HISTOGRAM_HEIGHT + MIN_TABLE_HEIGHT + KEY_HINTS_HEIGHT;

const NEWEST_FIRST: TraceSort = { column: "start_time", descending: true };

const SLOWEST_FIRST: TraceSort = { column: "duration_ms", descending: true };

const SHORT_ID_LENGTH = 8;

function hasErrors(trace: Trace) {
  return trace.error_count > 0;
}

function sameRoot(a: Trace, b: Trace) {
  return a.service_name === b.service_name && a.name === b.name;
}

interface TracesPageProps {
  service: string | undefined;
  operation: string | undefined;
  onServiceChange: (service: string | undefined) => void;
  onOpen: (traceId: string, spanId: string | undefined) => void;
  onCompare: (before: string, after: string) => void;
  onBack: (() => void) | undefined;
}

export function TracesPage({
  service,
  operation,
  onServiceChange,
  onOpen,
  onCompare,
  onBack,
}: TracesPageProps) {
  const search = useSearch();
  const [errorsOnly, setErrorsOnly] = useState(false);
  const deferredErrorsOnly = useDeferredValue(errorsOnly);
  const timeRange = useTimeRange();
  const [sort, setSort] = useState(operation === undefined ? NEWEST_FIRST : SLOWEST_FIRST);
  const deferredSort = useDeferredValue(sort);

  const connection = useConnection();
  const filter = {
    search: search.deferredText,
    errorsOnly: deferredErrorsOnly,
    serviceName: service,
    operationName: operation,
  };
  const query = { ...filter, timeRange: timeRange.deferredSelected, sort: deferredSort };
  const [traceList, traceTimeline] = useSuspenseQueries({
    queries: [traceListQuery(connection, query), traceTimelineQuery(connection, filter)],
  });

  const { traces, totalCount } = traceList.data;
  const timeline = traceTimeline.data;

  const selection = useSelection(traces, (trace) => trace.trace_id);
  const { selected } = selection;
  const [markedId, setMarkedId] = useState<string>();
  const marked = traces.find((trace) => trace.trace_id === markedId);
  const comparable =
    marked !== undefined &&
    selected !== undefined &&
    marked.trace_id !== selected.trace_id &&
    sameRoot(marked, selected);

  const filtered =
    search.deferredText !== "" ||
    deferredErrorsOnly ||
    timeRange.deferredSelected !== undefined ||
    service !== undefined;
  const browsing = !search.isEditing;

  const { height = 0 } = useRegionSize();

  return (
    <box flexGrow={1}>
      <PageHeader>
        <SearchInput search={search} placeholder="trace name, service, ID or key=value" />
        {service !== undefined && (
          <Chip>
            <ServiceName name={service} />
          </Chip>
        )}
        {operation !== undefined && <Chip>{operation}</Chip>}
        {errorsOnly && <Chip color={THEME.textError}>errors only</Chip>}
        {timeRange.selected !== undefined && <Chip>{timeRangeLabel(timeRange.selected)}</Chip>}
        {marked !== undefined ? (
          <Chip>
            vs {marked.name} {formatDuration(marked.duration_ms)}
          </Chip>
        ) : (
          markedId !== undefined && <Chip>vs {markedId.slice(0, SHORT_ID_LENGTH)}</Chip>
        )}
        <Count>{formatShownCount(traces.length, totalCount, "trace")}</Count>
      </PageHeader>
      {height >= MIN_HEIGHT_FOR_HISTOGRAM && (
        <TimeHistogram
          title="Traces over time"
          occupied={timeline.occupied}
          newestBucketMs={timeline.newestBucketMs}
          selected={timeRange.selected}
        />
      )}
      {traceList.isError ? (
        <Placeholder text="Failed to load traces" variant="error" />
      ) : selected === undefined ? (
        <Placeholder text={filtered ? "No traces match" : "Waiting for traces..."} />
      ) : (
        <FocusScope focused={browsing}>
          <TraceTable traces={traces} selection={selection} sort={deferredSort} />
        </FocusScope>
      )}
      <KeyHints>
        <FocusScope focused={browsing}>
          {selected !== undefined && (
            <>
              <Key
                name="return"
                onPress={() => onOpen(selected.trace_id, selected.operation_span_id ?? undefined)}
              >
                open
              </Key>
              <Key
                name="m"
                description={
                  markedId === selected.trace_id
                    ? "unmark the trace to compare with"
                    : "mark the trace to compare with"
                }
                onPress={() =>
                  setMarkedId((markedId) =>
                    markedId === selected.trace_id ? undefined : selected.trace_id,
                  )
                }
              >
                {markedId === selected.trace_id ? "unmark" : "mark"}
              </Key>
              {comparable && (
                <Key
                  name="c"
                  description="compare with the marked trace, which has the same root span"
                  onPress={() => onCompare(marked.trace_id, selected.trace_id)}
                >
                  compare
                </Key>
              )}
              <CopyKey name="y" text={selected.trace_id}>
                copy id
              </CopyKey>
            </>
          )}
          {traces.some((trace) => hasErrors(trace)) && (
            <StepKeys
              forward="e"
              backwardDescription="previous error"
              backward="shift+e"
              onStep={(step) =>
                selection.select(
                  findNextIndex(traces, selection.index, step, (trace) => hasErrors(trace)),
                )
              }
            >
              next error
            </StepKeys>
          )}
        </FocusScope>
        <SearchKeys search={search} />
        <FocusScope focused={browsing}>
          {search.text === "" && timeRange.selected !== undefined && (
            <Key name="escape" onPress={() => timeRange.clear()}>
              any time
            </Key>
          )}
          {search.text === "" && timeRange.selected === undefined && onBack !== undefined && (
            <Key name="escape" onPress={() => onBack()}>
              back
            </Key>
          )}
          {search.text === "" &&
            timeRange.selected === undefined &&
            onBack === undefined &&
            service !== undefined && (
              <Key name="escape" onPress={() => onServiceChange(undefined)}>
                all traces
              </Key>
            )}
          {timeline.occupied.length > 0 && (
            <StepKeys
              forward="right"
              description="later range"
              backwardDescription="earlier range"
              backward="left"
              onStep={(step) => timeRange.step(timeline.occupied, step)}
            >
              range
            </StepKeys>
          )}
          <Key name="s" onPress={() => setErrorsOnly((errorsOnly) => !errorsOnly)}>
            status
          </Key>
          <SortKeys columns={TRACE_SORT_COLUMNS} onChange={(action) => setSort(action)} />
          <PauseKey />
        </FocusScope>
      </KeyHints>
    </box>
  );
}
