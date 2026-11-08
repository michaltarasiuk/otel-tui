import type { ScrollBoxRenderable } from "@opentui/core";
import { useRef } from "react";

import { FocusScope } from "#tui/components/focus.tsx";
import { Key, KeyHints, StepKeys } from "#tui/components/key-hints.tsx";
import { Placeholder } from "#tui/components/placeholder.tsx";
import { ScrollKeys } from "#tui/components/scroll-box.tsx";
import { Split } from "#tui/components/split.tsx";
import { useRegion } from "#tui/components/use-region.ts";
import { useSelection } from "#tui/components/use-selection.ts";
import { PauseKey } from "#tui/pause.tsx";

import { ExemplarList } from "./exemplar-list.tsx";
import { MetricHeader } from "./metric-header.tsx";
import { useMetricSeries, useSeriesExemplars } from "./metric-queries.ts";
import type { Metric } from "./metric.ts";
import { attributeColumns, seriesLabel, sortByColumns } from "./series-columns.ts";
import { SeriesDetails } from "./series-details.tsx";
import { SeriesTable } from "./series-table.tsx";
import type { Exemplar } from "./series.ts";

const REGION_KEYS_PRIORITY = 1;

const SERIES_ONLY = ["series"] as const;
const SERIES_AND_EXEMPLARS = ["series", "exemplars"] as const;

function exemplarKey(exemplar: Exemplar) {
  return `${exemplar.time}:${exemplar.value}:${exemplar.span_id}`;
}

interface MetricPageProps {
  metric: Metric;
  onBack: () => void;
  onOpenTrace: (traceId: string, spanId: string | undefined) => void;
}

export function MetricPage({ metric, onBack, onOpenTrace }: MetricPageProps) {
  const metricSeries = useMetricSeries(metric);
  const detailsRef = useRef<ScrollBoxRenderable>(null);

  const { data: series = [] } = metricSeries;

  const columns = attributeColumns(series);
  const rows = sortByColumns(series, columns);
  const [selectedIndex, select] = useSelection(rows, (row) => row.series_id);
  const selected = rows[selectedIndex];
  const windowStart = Math.min(...series.map((row) => row.first_time));

  const seriesExemplars = useSeriesExemplars(metric, selected?.series_id);
  const { data: exemplars = [] } = seriesExemplars;
  const [exemplarIndex, selectExemplar] = useSelection(exemplars, (exemplar) =>
    exemplarKey(exemplar),
  );
  const exemplar = exemplars[exemplarIndex];
  const exemplarTraceId = exemplar?.has_trace === true ? exemplar.trace_id : null;

  const [region, stepRegion, focusRegion] = useRegion(
    exemplars.length > 0 ? SERIES_AND_EXEMPLARS : SERIES_ONLY,
  );

  return (
    <box flexGrow={1}>
      {metricSeries.isError ? (
        <Placeholder text="Failed to load metric" variant="error" />
      ) : selected === undefined ? (
        <Placeholder
          text={metricSeries.isPending ? "Loading metric..." : "This metric is no longer available"}
        />
      ) : (
        <>
          <box paddingX={1}>
            <MetricHeader metric={metric} seriesCount={series.length} />
          </box>
          <Split>
            <FocusScope focused={region === "series"} onFocusRequest={() => focusRegion("series")}>
              <SeriesTable
                series={rows}
                selectedIndex={selectedIndex}
                onSelect={(action) => select(action)}
                metric={metric}
                columns={columns}
              />
            </FocusScope>
            <SeriesDetails
              key={selected.series_id}
              ref={detailsRef}
              metric={metric}
              series={selected}
              label={seriesLabel(selected, columns)}
              windowStart={windowStart}
            >
              <FocusScope
                focused={region === "exemplars"}
                onFocusRequest={() => focusRegion("exemplars")}
              >
                <ExemplarList
                  exemplars={exemplars}
                  failed={seriesExemplars.isError}
                  unit={metric.unit}
                  selectedIndex={exemplarIndex}
                  onSelect={(index) => selectExemplar(index)}
                />
              </FocusScope>
            </SeriesDetails>
          </Split>
        </>
      )}
      <KeyHints>
        <Key name="escape" onPress={() => onBack()}>
          back
        </Key>
        <FocusScope focused={region === "exemplars"}>
          <StepKeys
            forward="down"
            description="next exemplar"
            backwardDescription="previous exemplar"
            backward="up"
            onStep={(step) => selectExemplar((index) => index + step)}
          />
          <StepKeys
            forward="j"
            description="next exemplar"
            backwardDescription="previous exemplar"
            backward="k"
            onStep={(step) => selectExemplar((index) => index + step)}
          />
          {exemplarTraceId !== null && (
            <Key
              name="return"
              onPress={() => onOpenTrace(exemplarTraceId, exemplar?.span_id ?? undefined)}
            >
              open trace
            </Key>
          )}
        </FocusScope>
        {selected !== undefined && <ScrollKeys target={detailsRef} />}
        <PauseKey />
        <StepKeys
          forward="tab"
          description="next region"
          backwardDescription="previous region"
          backward="shift+tab"
          priority={REGION_KEYS_PRIORITY}
          onStep={(step) => stepRegion(step)}
        />
      </KeyHints>
    </box>
  );
}
