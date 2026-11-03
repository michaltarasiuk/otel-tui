import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { cycle } from "../../utils/cycle.ts";
import { formatShownCount } from "../../utils/format-shown-count.ts";
import { FilterBar } from "../filter-bar.tsx";
import { FocusScope, useFocused } from "../focus.tsx";
import { Placeholder } from "../placeholder.tsx";
import { useSearch } from "../use-search.ts";
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

  const search = useSearch();
  const [sort, setSort] = useState(BY_NAME);

  const metricList = useMetricList({ search: search.text, sort });
  const metricTotalCount = useMetricTotalCount();

  const { data: metrics = [] } = metricList;
  const { data: totalCount = 0 } = metricTotalCount;

  const isPending = metricList.isPending || metricTotalCount.isPending;
  const isError = metricList.isError || metricTotalCount.isError;

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        ...search.commands,
        {
          name: "metrics.next-sort",
          desc: "sort",
          enabled: !search.isEditing,
          run() {
            setSort((sort) => nextSort(sort.column));
          },
        },
        {
          name: "metrics.reverse-sort",
          desc: "reverse",
          enabled: !search.isEditing,
          run() {
            setSort((sort) => ({ ...sort, descending: !sort.descending }));
          },
        },
      ],
      bindings: [
        ...search.bindings,
        { key: "o", cmd: "metrics.next-sort" },
        { key: "shift+o", cmd: "metrics.reverse-sort" },
      ],
    }),
    [focused, search],
  );

  function renderMetrics() {
    if (isError) {
      return <Placeholder text="Failed to load metrics" variant="error" />;
    }
    if (isPending || metrics.length === 0) {
      return (
        <Placeholder text={search.text !== "" ? "No metrics match" : "Waiting for metrics..."} />
      );
    }
    return (
      <FocusScope focused={!search.isEditing}>
        <MetricTable metrics={metrics} sort={sort} onOpen={(metric) => onOpen(metric)} />
      </FocusScope>
    );
  }

  return (
    <box flexGrow={1}>
      <FilterBar
        search={search}
        placeholder="name, description, service or attributes"
        count={formatShownCount(metrics.length, totalCount, "metric")}
      />
      {renderMetrics()}
    </box>
  );
}
