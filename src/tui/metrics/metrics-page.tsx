import type { ScrollBoxRenderable } from "@opentui/core";
import { useRef, useState } from "react";

import { FocusScope } from "#tui/components/focus.tsx";
import { Key, KeyHints } from "#tui/components/key-hints.tsx";
import { Count, PageHeader, SearchInput } from "#tui/components/page-header.tsx";
import { Placeholder } from "#tui/components/placeholder.tsx";
import { ScrollKeys } from "#tui/components/scroll-box.tsx";
import { SearchKeys } from "#tui/components/search-keys.tsx";
import { Split } from "#tui/components/split.tsx";
import { useSearch } from "#tui/components/use-search.ts";
import { useSelection } from "#tui/components/use-selection.ts";
import { formatShownCount } from "#utils/format-shown-count.ts";
import { stepItem } from "#utils/step-item.ts";

import { MetricDetails } from "./metric-details.tsx";
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
  const next = stepItem(METRIC_SORT_COLUMNS, column, 1);
  return { column: next, descending: DESCENDING_FIRST[next] };
}

interface MetricsPageProps {
  onOpen: (metric: Metric) => void;
}

export function MetricsPage({ onOpen }: MetricsPageProps) {
  const search = useSearch();
  const [sort, setSort] = useState(BY_NAME);
  const detailsRef = useRef<ScrollBoxRenderable>(null);

  const metricList = useMetricList({ search: search.text, sort });
  const metricTotalCount = useMetricTotalCount();

  const { data: metrics = [] } = metricList;
  const { data: totalCount = 0 } = metricTotalCount;

  const [selectedIndex, select] = useSelection(metrics, (metric) => metric.metric_id);
  const selected = metrics[selectedIndex];

  const browsing = !search.isEditing;

  const isPending = metricList.isPending || metricTotalCount.isPending;
  const isError = metricList.isError || metricTotalCount.isError;

  return (
    <box flexGrow={1}>
      <PageHeader>
        <SearchInput search={search} placeholder="name, description, service or key=value" />
        <Count>{formatShownCount(metrics.length, totalCount, "metric")}</Count>
      </PageHeader>
      {isError ? (
        <Placeholder text="Failed to load metrics" variant="error" />
      ) : isPending || selected === undefined ? (
        <Placeholder text={search.text !== "" ? "No metrics match" : "Waiting for metrics..."} />
      ) : (
        <FocusScope focused={browsing}>
          <Split>
            <MetricTable
              metrics={metrics}
              selectedIndex={selectedIndex}
              onSelect={(action) => select(action)}
              sort={sort}
            />
            <MetricDetails key={selected.metric_id} ref={detailsRef} metric={selected} />
          </Split>
        </FocusScope>
      )}
      <KeyHints>
        <FocusScope focused={browsing}>
          {selected !== undefined && (
            <Key name="return" onPress={() => onOpen(selected)}>
              open
            </Key>
          )}
        </FocusScope>
        <SearchKeys search={search} />
        <FocusScope focused={browsing}>
          <Key name="o" onPress={() => setSort((sort) => nextSort(sort.column))}>
            sort
          </Key>
          <Key
            name="shift+o"
            onPress={() => setSort((sort) => ({ ...sort, descending: !sort.descending }))}
          >
            reverse
          </Key>
          {selected !== undefined && <ScrollKeys target={detailsRef} />}
        </FocusScope>
      </KeyHints>
    </box>
  );
}
