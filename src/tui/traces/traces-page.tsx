import type { BoxRenderable } from "@opentui/core";
import { useRef, useState } from "react";

import { CopyKey } from "#tui/clipboard.tsx";
import { FocusScope } from "#tui/components/focus.tsx";
import { Key, KeyHints, StepKeys } from "#tui/components/key-hints.tsx";
import { Chip, Count, PageHeader, SearchInput } from "#tui/components/page-header.tsx";
import { Placeholder } from "#tui/components/placeholder.tsx";
import { SearchKeys } from "#tui/components/search-keys.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { useSearch } from "#tui/components/use-search.ts";
import { useSelection } from "#tui/components/use-selection.ts";
import { PauseKey } from "#tui/pause.tsx";
import { THEME } from "#tui/theme/theme.ts";
import { findNextIndex } from "#utils/find-next-index.ts";
import { formatShownCount } from "#utils/format-shown-count.ts";
import { stepItem } from "#utils/step-item.ts";

import { type HistogramRange, stepSelection } from "./histogram.ts";
import { timeRangeLabel } from "./time-histogram.ts";
import { useTraceList, useTraceTimeline, useTraceTotalCount } from "./trace-queries.ts";
import { TraceTable } from "./trace-table.tsx";
import { TRACE_SORT_COLUMNS, type Trace, type TraceSort } from "./trace.ts";
import { HISTOGRAM_HEIGHT, TracesHistogram } from "./traces-histogram.tsx";

const PAGE_HEADER_HEIGHT = 1;
const MIN_TABLE_HEIGHT = 6;
const KEY_HINTS_HEIGHT = 1;
const MIN_HEIGHT_FOR_HISTOGRAM =
  PAGE_HEADER_HEIGHT + HISTOGRAM_HEIGHT + MIN_TABLE_HEIGHT + KEY_HINTS_HEIGHT;

const NO_BUCKETS: HistogramRange[] = [];

const NEWEST_FIRST: TraceSort = {
  column: "start_time",
  descending: true,
};

function hasErrors(trace: Trace) {
  return trace.error_count > 0;
}

interface TracesPageProps {
  service: string | undefined;
  onServiceChange: (service: string | undefined) => void;
  onOpen: (traceId: string) => void;
  onBack: (() => void) | undefined;
}

export function TracesPage({ service, onServiceChange, onOpen, onBack }: TracesPageProps) {
  const search = useSearch();
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [timeRange, setTimeRange] = useState<HistogramRange>();
  const [sort, setSort] = useState(NEWEST_FIRST);
  const [height, setHeight] = useState(0);

  const pageRef = useRef<BoxRenderable>(null);

  const traceList = useTraceList({
    search: search.text,
    errorsOnly,
    serviceName: service,
    timeRange,
    sort,
  });
  const traceTimeline = useTraceTimeline({ search: search.text, errorsOnly, serviceName: service });
  const traceTotalCount = useTraceTotalCount();

  const { data: traces = [] } = traceList;
  const { data: timeline } = traceTimeline;
  const { data: totalCount = 0 } = traceTotalCount;

  const [selectedIndex, select] = useSelection(traces, (trace) => trace.trace_id);
  const selected = traces[selectedIndex];

  const occupied = timeline?.occupied ?? NO_BUCKETS;
  const filtered =
    search.text !== "" || errorsOnly || timeRange !== undefined || service !== undefined;
  const browsing = !search.isEditing;

  const isPending = traceList.isPending || traceTotalCount.isPending;
  const isError = traceList.isError || traceTotalCount.isError;

  return (
    <box ref={pageRef} flexGrow={1} onSizeChange={() => setHeight(pageRef.current?.height ?? 0)}>
      <PageHeader>
        <SearchInput search={search} placeholder="trace name, service, ID or key=value" />
        {service !== undefined && (
          <Chip>
            <ServiceName name={service} />
          </Chip>
        )}
        {errorsOnly && <Chip color={THEME.textError}>errors only</Chip>}
        {timeRange !== undefined && <Chip>{timeRangeLabel(timeRange)}</Chip>}
        <Count>{formatShownCount(traces.length, totalCount, "trace")}</Count>
      </PageHeader>
      {timeline !== undefined && height >= MIN_HEIGHT_FOR_HISTOGRAM && (
        <TracesHistogram
          occupied={timeline.occupied}
          newestBucketMs={timeline.newestBucketMs}
          selected={timeRange}
        />
      )}
      {isError ? (
        <Placeholder text="Failed to load traces" variant="error" />
      ) : isPending || selected === undefined ? (
        <Placeholder text={filtered ? "No traces match" : "Waiting for traces..."} />
      ) : (
        <FocusScope focused={browsing}>
          <TraceTable
            traces={traces}
            selectedIndex={selectedIndex}
            onSelect={(action) => select(action)}
            sort={sort}
          />
        </FocusScope>
      )}
      <KeyHints>
        <FocusScope focused={browsing}>
          {selected !== undefined && (
            <>
              <Key name="return" onPress={() => onOpen(selected.trace_id)}>
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
          {occupied.length > 0 && (
            <StepKeys
              forward="right"
              description="later range"
              backwardDescription="earlier range"
              backward="left"
              onStep={(step) => setTimeRange((range) => stepSelection(occupied, range, step))}
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
                column: stepItem(TRACE_SORT_COLUMNS, sort.column, 1),
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
