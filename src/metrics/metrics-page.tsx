import type { ScrollBoxRenderable } from "@opentui/core";
import { useDeferredValue, useRef, useState } from "react";

import { CopyKey } from "#ui/clipboard.tsx";
import { FocusScope } from "#ui/focus.tsx";
import { Key, KeyHints } from "#ui/key-hints.tsx";
import { Count, PageHeader, SearchInput } from "#ui/page-header.tsx";
import { PauseKey } from "#ui/pause.tsx";
import { Placeholder } from "#ui/placeholder.tsx";
import { ScrollKeys } from "#ui/scroll-box.tsx";
import { SearchKeys } from "#ui/search-keys.tsx";
import { Split } from "#ui/split.tsx";
import { useSearch } from "#ui/use-search.ts";
import { useSelection } from "#ui/use-selection.ts";
import { cycle } from "#utils/cycle.ts";
import { formatShownCount } from "#utils/number.ts";

import { MetricDetails } from "./metric-details.tsx";
import { useMetrics } from "./metric-queries.ts";
import { MetricTable } from "./metric-table.tsx";
import {
  METRIC_SORT_COLUMNS,
  type Metric,
  type MetricSort,
  type MetricSortColumn,
} from "./metric.ts";

const BY_NAME: MetricSort = { column: "name", descending: false };

const DESCENDING_FIRST = { name: false, series_count: true, last_time: true } satisfies Record<
  MetricSortColumn,
  boolean
>;

function nextSort(column: MetricSortColumn) {
  const next = cycle(METRIC_SORT_COLUMNS, column, 1);
  return { column: next, descending: DESCENDING_FIRST[next] };
}

interface MetricsPageProps {
  onOpen: (metric: Metric) => void;
}

export function MetricsPage({ onOpen }: MetricsPageProps) {
  const search = useSearch();
  const [sort, setSort] = useState(BY_NAME);
  const deferredSort = useDeferredValue(sort);

  const metricList = useMetrics({ search: search.deferredText, sort: deferredSort });
  const { metrics, totalCount } = metricList.data;

  const [selectedIndex, select] = useSelection(metrics, (metric) => metric.metric_id);
  const selected = metrics[selectedIndex];
  const deferredSelected = useDeferredValue(selected);

  const browsing = !search.isEditing;

  const detailsRef = useRef<ScrollBoxRenderable>(null);

  return (
    <box flexGrow={1}>
      <PageHeader>
        <SearchInput search={search} placeholder="name, description, service or key=value" />
        <Count>{formatShownCount(metrics.length, totalCount, "metric")}</Count>
      </PageHeader>
      {metricList.isError ? (
        <Placeholder text="Failed to load metrics" variant="error" />
      ) : selected === undefined || deferredSelected === undefined ? (
        <Placeholder
          text={search.deferredText !== "" ? "No metrics match" : "Waiting for metrics..."}
        />
      ) : (
        <FocusScope focused={browsing}>
          <Split>
            <MetricTable
              metrics={metrics}
              selectedIndex={selectedIndex}
              onSelect={(action) => select(action)}
              sort={deferredSort}
            />
            <MetricDetails
              key={deferredSelected.metric_id}
              ref={detailsRef}
              metric={deferredSelected}
            />
          </Split>
        </FocusScope>
      )}
      <KeyHints>
        <FocusScope focused={browsing}>
          {selected !== undefined && (
            <>
              <Key name="return" onPress={() => onOpen(selected)}>
                open
              </Key>
              <CopyKey name="y" text={selected.name}>
                copy name
              </CopyKey>
            </>
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
          <PauseKey />
        </FocusScope>
      </KeyHints>
    </box>
  );
}
