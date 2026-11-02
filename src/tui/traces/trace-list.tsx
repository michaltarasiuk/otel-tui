import type { BoxRenderable } from "@opentui/core";
import { useBindings } from "@opentui/keymap/react";
import { useRef, useState } from "react";

import { cycle } from "../../utils/cycle.ts";
import { FocusScope, useFocused } from "../focus.tsx";
import { Placeholder } from "../placeholder.tsx";
import { type HistogramRange, stepSelection } from "./histogram.ts";
import { TraceFilterBar } from "./trace-filter-bar.tsx";
import { TRACE_HISTOGRAM_HEIGHT, TraceHistogram } from "./trace-histogram.tsx";
import { useTraceList, useTraceTimeline, useTraceTotalCount } from "./trace-queries.ts";
import { TraceTable } from "./trace-table.tsx";
import { TRACE_SORT_COLUMNS, type TraceSort } from "./trace.ts";

const FILTER_BAR_HEIGHT = 1;
const MIN_TABLE_HEIGHT = 6;
const MIN_HEIGHT_FOR_HISTOGRAM = FILTER_BAR_HEIGHT + TRACE_HISTOGRAM_HEIGHT + MIN_TABLE_HEIGHT;

const NO_BUCKETS: HistogramRange[] = [];

const NEWEST_FIRST: TraceSort = {
  column: "start_time",
  descending: true,
};

interface TraceListProps {
  onOpen: (traceId: string) => void;
}

export function TraceList({ onOpen }: TraceListProps) {
  const focused = useFocused();

  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [timeRange, setTimeRange] = useState<HistogramRange>();
  const [sort, setSort] = useState(NEWEST_FIRST);
  const [height, setHeight] = useState(0);

  const listRef = useRef<BoxRenderable>(null);

  const traceList = useTraceList({ search, errorsOnly, timeRange, sort });
  const traceTimeline = useTraceTimeline({ search, errorsOnly });
  const traceTotalCount = useTraceTotalCount();

  const { data: traces = [] } = traceList;
  const { data: timeline } = traceTimeline;
  const { data: totalCount = 0 } = traceTotalCount;

  const occupied = timeline?.occupied ?? NO_BUCKETS;
  const canMoveRange = !searching && occupied.length > 0;

  const isPending = traceList.isPending || traceTotalCount.isPending;
  const isError = traceList.isError || traceTotalCount.isError;

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        {
          name: "traces.search",
          desc: "search",
          enabled: !searching,
          run() {
            setSearching(true);
          },
        },
        {
          name: "traces.apply-search",
          desc: "apply",
          enabled: searching,
          run() {
            setSearching(false);
          },
        },
        {
          name: "traces.clear-search",
          desc: "clear",
          enabled: searching || search !== "",
          run() {
            setSearch("");
            setSearching(false);
          },
        },
        {
          name: "traces.clear-range",
          desc: "any time",
          enabled: !searching && search === "" && timeRange !== undefined,
          run() {
            setTimeRange(undefined);
          },
        },
        {
          name: "traces.later-range",
          desc: "range",
          enabled: canMoveRange,
          run() {
            setTimeRange((range) => stepSelection(occupied, range, 1));
          },
        },
        {
          name: "traces.earlier-range",
          enabled: canMoveRange,
          run() {
            setTimeRange((range) => stepSelection(occupied, range, -1));
          },
        },
        {
          name: "traces.toggle-errors-only",
          desc: "status",
          enabled: !searching,
          run() {
            setErrorsOnly((errorsOnly) => !errorsOnly);
          },
        },
        {
          name: "traces.next-sort",
          desc: "sort",
          enabled: !searching,
          run() {
            setSort((sort) => ({
              column: cycle(TRACE_SORT_COLUMNS, sort.column, 1),
              descending: true,
            }));
          },
        },
        {
          name: "traces.reverse-sort",
          desc: "reverse",
          enabled: !searching,
          run() {
            setSort((sort) => ({ ...sort, descending: !sort.descending }));
          },
        },
      ],
      bindings: [
        { key: "/", cmd: "traces.search" },
        { key: "return", cmd: "traces.apply-search" },
        { key: "escape", cmd: "traces.clear-search" },
        { key: "escape", cmd: "traces.clear-range" },
        { key: "right", cmd: "traces.later-range" },
        { key: "left", cmd: "traces.earlier-range" },
        { key: "s", cmd: "traces.toggle-errors-only" },
        { key: "o", cmd: "traces.next-sort" },
        { key: "shift+o", cmd: "traces.reverse-sort" },
      ],
    }),
    [focused, searching, search, timeRange, occupied, canMoveRange],
  );

  const filtered = search !== "" || errorsOnly || timeRange !== undefined;

  function renderTraces() {
    if (isError) {
      return <Placeholder text="Failed to load traces" variant="error" />;
    }
    if (isPending || traces.length === 0) {
      return <Placeholder text={filtered ? "No traces match" : "Waiting for traces..."} />;
    }
    return (
      <FocusScope focused={!searching}>
        <TraceTable traces={traces} sort={sort} onOpen={(traceId) => onOpen(traceId)} />
      </FocusScope>
    );
  }

  return (
    <box ref={listRef} flexGrow={1} onSizeChange={() => setHeight(listRef.current?.height ?? 0)}>
      <TraceFilterBar
        search={search}
        searching={searching}
        errorsOnly={errorsOnly}
        timeRange={timeRange}
        shownCount={traces.length}
        totalCount={totalCount}
        onSearchInput={(search) => setSearch(search)}
      />
      {timeline !== undefined && height >= MIN_HEIGHT_FOR_HISTOGRAM && (
        <TraceHistogram
          occupied={timeline.occupied}
          newestBucketMs={timeline.newestBucketMs}
          selected={timeRange}
        />
      )}
      {renderTraces()}
    </box>
  );
}
