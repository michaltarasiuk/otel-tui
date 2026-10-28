import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { cycle } from "../../utils/cycle.ts";
import { FocusScope, useFocused } from "../focus.tsx";
import { Placeholder } from "../placeholder.tsx";
import { MetricFilterBar } from "./metric-filter-bar.tsx";
import { useMetricList, useMetricTotalCount } from "./metric-queries.ts";
import { MetricTable } from "./metric-table.tsx";
import {
  METRIC_SORT_COLUMNS,
  type Metric,
  type MetricSort,
  type MetricSortColumn,
} from "./metric.ts";

const BY_NAME: MetricSort = {
  column: "name",
  descending: false,
};

const DESCENDING_FIRST = {
  name: false,
  series_count: true,
  last_time: true,
} satisfies Record<MetricSortColumn, boolean>;

function nextSort(column: MetricSortColumn) {
  const next = cycle(METRIC_SORT_COLUMNS, column, 1);
  return { column: next, descending: DESCENDING_FIRST[next] };
}

interface MetricListProps {
  onOpen: (metric: Metric) => void;
}

export function MetricList({ onOpen }: MetricListProps) {
  const focused = useFocused();

  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [sort, setSort] = useState(BY_NAME);

  const metricList = useMetricList({ search, sort });
  const metricTotalCount = useMetricTotalCount();

  const { data: metrics = [] } = metricList;
  const { data: totalCount = 0 } = metricTotalCount;

  const isPending = metricList.isPending || metricTotalCount.isPending;
  const isError = metricList.isError || metricTotalCount.isError;

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        {
          name: "metrics.search",
          desc: "search",
          enabled: !searching,
          run() {
            setSearching(true);
          },
        },
        {
          name: "metrics.apply-search",
          desc: "apply",
          enabled: searching,
          run() {
            setSearching(false);
          },
        },
        {
          name: "metrics.clear-search",
          desc: "clear",
          enabled: searching || search !== "",
          run() {
            setSearch("");
            setSearching(false);
          },
        },
        {
          name: "metrics.next-sort",
          desc: "sort",
          enabled: !searching,
          run() {
            setSort((sort) => nextSort(sort.column));
          },
        },
        {
          name: "metrics.reverse-sort",
          desc: "reverse",
          enabled: !searching,
          run() {
            setSort((sort) => ({ ...sort, descending: !sort.descending }));
          },
        },
      ],
      bindings: [
        { key: "/", cmd: "metrics.search" },
        { key: "return", cmd: "metrics.apply-search" },
        { key: "escape", cmd: "metrics.clear-search" },
        { key: "o", cmd: "metrics.next-sort" },
        { key: "shift+o", cmd: "metrics.reverse-sort" },
      ],
    }),
    [focused, searching, search],
  );

  function renderMetrics() {
    if (isError) {
      return <Placeholder text="Failed to load metrics" variant="error" />;
    }
    if (isPending || metrics.length === 0) {
      return <Placeholder text={search !== "" ? "No metrics match" : "Waiting for metrics..."} />;
    }
    return (
      <FocusScope focused={!searching}>
        <MetricTable metrics={metrics} sort={sort} onOpen={onOpen} />
      </FocusScope>
    );
  }

  return (
    <box flexGrow={1}>
      <MetricFilterBar
        search={search}
        searching={searching}
        shownCount={metrics.length}
        totalCount={totalCount}
        onSearchInput={(search) => setSearch(search)}
      />
      {renderMetrics()}
    </box>
  );
}
