import { useSuspenseQueries } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";

import { useConnection } from "#query/connection.ts";
import { CopyKey } from "#ui/clipboard.tsx";
import { Meta } from "#ui/details.tsx";
import { FocusScope } from "#ui/focus.tsx";
import { RangeKeys } from "#ui/histogram/range-keys.tsx";
import { timeRangeLabel } from "#ui/histogram/time-columns.ts";
import { HISTOGRAM_HEIGHT, TimeHistogram } from "#ui/histogram/time-histogram.tsx";
import { useTimeRange } from "#ui/histogram/use-time-range.ts";
import { ErrorKeys, Key, KeyHints, SortKeys } from "#ui/key-hints.tsx";
import { Chip, Count, PageHeader } from "#ui/page-header.tsx";
import { PauseKey } from "#ui/pause.tsx";
import { Placeholder } from "#ui/placeholder.tsx";
import { SearchInput } from "#ui/search-input.tsx";
import { SearchKeys } from "#ui/search-keys.tsx";
import { ServiceName } from "#ui/service-name.tsx";
import { useRegionSize } from "#ui/size.tsx";
import { THEME } from "#ui/theme.ts";
import { useSearch } from "#ui/use-search.ts";
import { useSelection } from "#ui/use-selection.ts";
import { findNextIndex } from "#utils/cycle.ts";
import { formatShownCount } from "#utils/number.ts";
import { formatDuration } from "#utils/time.ts";

import { MarkKeys } from "./mark-keys.tsx";
import { traceListQuery, traceTimelineQuery } from "./trace-queries.ts";
import { TraceTable } from "./trace-table.tsx";
import { type MarkedTrace, TRACE_SORT_COLUMNS, type Trace, type TraceSort } from "./trace.ts";

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
  marked: MarkedTrace | undefined;
  onOpen: (traceId: string, spanId: string | undefined) => void;
  onMark: (marked: MarkedTrace | undefined) => void;
  onCompare: (before: string, after: string) => void;
  onBack: (() => void) | undefined;
}

export function TracesPage({
  service,
  operation,
  onServiceChange,
  marked,
  onOpen,
  onMark,
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
  const markedRow = traces.find((trace) => trace.trace_id === marked?.traceId);

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
        <Meta>
          {service !== undefined && (
            <Chip>
              <ServiceName name={service} />
            </Chip>
          )}
          {operation !== undefined && <Chip>{operation}</Chip>}
          {errorsOnly && <Chip color={THEME.textError}>errors only</Chip>}
          {timeRange.selected !== undefined && <Chip>{timeRangeLabel(timeRange.selected)}</Chip>}
          {markedRow !== undefined ? (
            <Chip>
              vs {markedRow.name} {formatDuration(markedRow.duration_ms)}
            </Chip>
          ) : (
            marked !== undefined && <Chip>vs {marked.root.name}</Chip>
          )}
          <Count>{formatShownCount(traces.length, totalCount, "trace")}</Count>
        </Meta>
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
        <SearchInput search={search} placeholder="trace name, service, ID or key=value" />
        <SearchKeys search={search} />
        <FocusScope focused={browsing}>
          {selected !== undefined && (
            <>
              <Key
                name="return"
                onPress={() => onOpen(selected.trace_id, selected.operation_span_id ?? undefined)}
              >
                open
              </Key>
              <MarkKeys
                trace={{
                  traceId: selected.trace_id,
                  root: { service_name: selected.service_name, name: selected.name },
                }}
                marked={markedRow === undefined ? undefined : marked}
                onMark={(marked) => onMark(marked)}
                onCompare={(before, after) => onCompare(before, after)}
              />
              <CopyKey name="y" text={selected.trace_id}>
                copy id
              </CopyKey>
            </>
          )}
          {traces.some((trace) => hasErrors(trace)) && (
            <ErrorKeys
              onStep={(step) =>
                selection.select(
                  findNextIndex(traces, selection.index, step, (trace) => hasErrors(trace)),
                )
              }
            />
          )}
        </FocusScope>
        <FocusScope focused={browsing}>
          {search.text === "" &&
            (timeRange.selected !== undefined ? (
              <Key name="escape" onPress={() => timeRange.clear()}>
                any time
              </Key>
            ) : onBack !== undefined ? (
              <Key name="escape" onPress={() => onBack()}>
                back
              </Key>
            ) : (
              service !== undefined && (
                <Key name="escape" onPress={() => onServiceChange(undefined)}>
                  all traces
                </Key>
              )
            ))}
          {timeline.occupied.length > 0 && (
            <RangeKeys timeRange={timeRange} occupied={timeline.occupied} />
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
