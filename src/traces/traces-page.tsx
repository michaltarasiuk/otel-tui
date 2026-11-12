import { useSuspenseQueries } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";

import { useConnection } from "#query/connection.ts";
import { CopyKey } from "#ui/clipboard.tsx";
import { FocusScope } from "#ui/focus.tsx";
import { type HistogramRange, stepSelection } from "#ui/histogram/bars.ts";
import { timeRangeLabel } from "#ui/histogram/time-columns.ts";
import { HISTOGRAM_HEIGHT, TimeHistogram } from "#ui/histogram/time-histogram.tsx";
import { Key, KeyHints, StepKeys } from "#ui/key-hints.tsx";
import { Chip, Count, PageHeader, SearchInput } from "#ui/page-header.tsx";
import { PauseKey } from "#ui/pause.tsx";
import { Placeholder } from "#ui/placeholder.tsx";
import { SearchKeys } from "#ui/search-keys.tsx";
import { ServiceName } from "#ui/service-name.tsx";
import { useRegionSize } from "#ui/size.tsx";
import { THEME } from "#ui/theme.ts";
import { useSearch } from "#ui/use-search.ts";
import { useSelection } from "#ui/use-selection.ts";
import { cycle, findNextIndex } from "#utils/cycle.ts";
import { formatShownCount } from "#utils/number.ts";

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

function hasErrors(trace: Trace) {
  return trace.error_count > 0;
}

interface TracesPageProps {
  service: string | undefined;
  operation: string | undefined;
  onServiceChange: (service: string | undefined) => void;
  onOpen: (traceId: string, spanId: string | undefined) => void;
  onBack: (() => void) | undefined;
}

export function TracesPage({
  service,
  operation,
  onServiceChange,
  onOpen,
  onBack,
}: TracesPageProps) {
  const search = useSearch();
  const [errorsOnly, setErrorsOnly] = useState(false);
  const deferredErrorsOnly = useDeferredValue(errorsOnly);
  const [timeRange, setTimeRange] = useState<HistogramRange | undefined>(undefined);
  const deferredTimeRange = useDeferredValue(timeRange);
  const [sort, setSort] = useState(operation === undefined ? NEWEST_FIRST : SLOWEST_FIRST);
  const deferredSort = useDeferredValue(sort);

  const connection = useConnection();
  const filter = {
    search: search.deferredText,
    errorsOnly: deferredErrorsOnly,
    serviceName: service,
    operationName: operation,
  };
  const query = { ...filter, timeRange: deferredTimeRange, sort: deferredSort };
  const [traceList, traceTimeline] = useSuspenseQueries({
    queries: [traceListQuery(connection, query), traceTimelineQuery(connection, filter)],
  });

  const { traces, totalCount } = traceList.data;
  const timeline = traceTimeline.data;

  const [selectedIndex, select] = useSelection(traces, (trace) => trace.trace_id);
  const selected = traces[selectedIndex];

  const filtered =
    search.deferredText !== "" ||
    deferredErrorsOnly ||
    deferredTimeRange !== undefined ||
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
        {timeRange !== undefined && <Chip>{timeRangeLabel(timeRange)}</Chip>}
        <Count>{formatShownCount(traces.length, totalCount, "trace")}</Count>
      </PageHeader>
      {height >= MIN_HEIGHT_FOR_HISTOGRAM && (
        <TimeHistogram
          title="Traces over time"
          occupied={timeline.occupied}
          newestBucketMs={timeline.newestBucketMs}
          selected={timeRange}
        />
      )}
      {traceList.isError ? (
        <Placeholder text="Failed to load traces" variant="error" />
      ) : selected === undefined ? (
        <Placeholder text={filtered ? "No traces match" : "Waiting for traces..."} />
      ) : (
        <FocusScope focused={browsing}>
          <TraceTable
            traces={traces}
            selectedIndex={selectedIndex}
            onSelect={(action) => select(action)}
            sort={deferredSort}
          />
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
                select((index) => findNextIndex(traces, index, step, (trace) => hasErrors(trace)))
              }
            >
              next error
            </StepKeys>
          )}
        </FocusScope>
        <SearchKeys search={search} />
        <FocusScope focused={browsing}>
          {search.text === "" && timeRange !== undefined && (
            <Key name="escape" onPress={() => setTimeRange(undefined)}>
              any time
            </Key>
          )}
          {search.text === "" && timeRange === undefined && onBack !== undefined && (
            <Key name="escape" onPress={() => onBack()}>
              back
            </Key>
          )}
          {search.text === "" &&
            timeRange === undefined &&
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
              onStep={(step) =>
                setTimeRange((range) => stepSelection(timeline.occupied, range, step))
              }
            >
              range
            </StepKeys>
          )}
          <Key name="s" onPress={() => setErrorsOnly((errorsOnly) => !errorsOnly)}>
            status
          </Key>
          <Key
            name="o"
            onPress={() =>
              setSort((sort) => ({
                column: cycle(TRACE_SORT_COLUMNS, sort.column, 1),
                descending: true,
              }))
            }
          >
            sort
          </Key>
          <Key
            name="shift+o"
            onPress={() => setSort((sort) => ({ ...sort, descending: !sort.descending }))}
          >
            reverse
          </Key>
          <PauseKey />
        </FocusScope>
      </KeyHints>
    </box>
  );
}
