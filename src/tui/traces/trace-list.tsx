import type { BoxRenderable } from "@opentui/core";
import { useBindings } from "@opentui/keymap/react";
import { useRef, useState } from "react";

import { cycle } from "../../utils/cycle.ts";
import { formatShownCount } from "../../utils/text.ts";
import { FilterBar } from "../components/filter-bar.tsx";
import { FocusScope, useFocused } from "../components/focus.tsx";
import { Placeholder } from "../components/placeholder.tsx";
import { useSearch } from "../components/use-search.ts";
import { THEME } from "../theme/theme.ts";
import { type HistogramRange, stepSelection } from "./histogram.ts";
import { timeRangeLabel } from "./time-histogram.ts";
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

export function TraceList() {
  const focused = useFocused();

  const search = useSearch();
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [timeRange, setTimeRange] = useState<HistogramRange>();
  const [sort, setSort] = useState(NEWEST_FIRST);
  const [height, setHeight] = useState(0);

  const listRef = useRef<BoxRenderable>(null);

  const traceList = useTraceList({ search: search.text, errorsOnly, timeRange, sort });
  const traceTimeline = useTraceTimeline({ search: search.text, errorsOnly });
  const traceTotalCount = useTraceTotalCount();

  const { data: traces = [] } = traceList;
  const { data: timeline } = traceTimeline;
  const { data: totalCount = 0 } = traceTotalCount;

  const occupied = timeline?.occupied ?? NO_BUCKETS;
  const canMoveRange = !search.isEditing && occupied.length > 0;

  const isPending = traceList.isPending || traceTotalCount.isPending;
  const isError = traceList.isError || traceTotalCount.isError;

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        ...search.commands,
        {
          name: "traces.clear-range",
          desc: "any time",
          enabled: !search.isEditing && search.text === "" && timeRange !== undefined,
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
          enabled: !search.isEditing,
          run() {
            setErrorsOnly((errorsOnly) => !errorsOnly);
          },
        },
        {
          name: "traces.next-sort",
          desc: "sort",
          enabled: !search.isEditing,
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
          enabled: !search.isEditing,
          run() {
            setSort((sort) => ({ ...sort, descending: !sort.descending }));
          },
        },
      ],
      bindings: [
        ...search.bindings,
        { key: "escape", cmd: "traces.clear-range" },
        { key: "right", cmd: "traces.later-range" },
        { key: "left", cmd: "traces.earlier-range" },
        { key: "s", cmd: "traces.toggle-errors-only" },
        { key: "o", cmd: "traces.next-sort" },
        { key: "shift+o", cmd: "traces.reverse-sort" },
      ],
    }),
    [focused, search, timeRange, occupied, canMoveRange],
  );

  const filtered = search.text !== "" || errorsOnly || timeRange !== undefined;

  function renderTraces() {
    if (isError) {
      return <Placeholder text="Failed to load traces" variant="error" />;
    }
    if (isPending || traces.length === 0) {
      return <Placeholder text={filtered ? "No traces match" : "Waiting for traces..."} />;
    }
    return (
      <FocusScope focused={!search.isEditing}>
        <TraceTable traces={traces} sort={sort} />
      </FocusScope>
    );
  }

  return (
    <box ref={listRef} flexGrow={1} onSizeChange={() => setHeight(listRef.current?.height ?? 0)}>
      <FilterBar
        search={search}
        placeholder="trace name, service or ID"
        count={formatShownCount(traces.length, totalCount, "trace")}
      >
        {errorsOnly && (
          <text fg={THEME.textError} flexShrink={0}>
            errors only
          </text>
        )}
        {timeRange !== undefined && (
          <text fg={THEME.text} flexShrink={0}>
            {timeRangeLabel(timeRange)}
          </text>
        )}
      </FilterBar>
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
