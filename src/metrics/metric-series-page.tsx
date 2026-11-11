import type { ScrollBoxRenderable } from "@opentui/core";
import { useDeferredValue, useRef, useState } from "react";

import { Description } from "#ui/details.tsx";
import { ErrorBoundary } from "#ui/error-boundary.tsx";
import { FocusScope } from "#ui/focus.tsx";
import { Key, KeyHints, StepKeys } from "#ui/key-hints.tsx";
import { PauseKey } from "#ui/pause.tsx";
import { Placeholder } from "#ui/placeholder.tsx";
import { ScrollKeys } from "#ui/scroll-box.tsx";
import { Split } from "#ui/split.tsx";
import { THEME } from "#ui/theme.ts";
import { useRegion } from "#ui/use-region.ts";
import { useSelection } from "#ui/use-selection.ts";
import { cycle } from "#utils/cycle.ts";
import { MINUTE_MS } from "#utils/time.ts";

import { ExemplarList } from "./exemplar-list.tsx";
import { MetricHeader } from "./metric-header.tsx";
import { useMetricSeries, useSeriesExemplars } from "./metric-queries.ts";
import type { Metric } from "./metric.ts";
import { attributeColumns, seriesLabel, sortByColumns } from "./series-columns.ts";
import { SeriesDetails } from "./series-details.tsx";
import { SeriesTable } from "./series-table.tsx";
import type { Exemplar } from "./series.ts";

const REGION_KEYS_PRIORITY = 1;

const CHART_WINDOWS = [undefined, 15 * MINUTE_MS, 5 * MINUTE_MS, MINUTE_MS] as const;

const SERIES_ONLY = ["series"] as const;
const SERIES_AND_EXEMPLARS = ["series", "exemplars"] as const;

function exemplarKey(exemplar: Exemplar) {
  return `${exemplar.time}:${exemplar.value}:${exemplar.span_id}`;
}

interface MetricSeriesPageProps {
  metric: Metric;
  onBack: () => void;
  onOpenTrace: (traceId: string, spanId: string | undefined) => void;
}

export function MetricSeriesPage({ metric, onBack, onOpenTrace }: MetricSeriesPageProps) {
  const [chartWindow, setChartWindow] = useState<(typeof CHART_WINDOWS)[number]>();

  const detailsRef = useRef<ScrollBoxRenderable>(null);

  const metricSeries = useMetricSeries(metric);
  const { data: series } = metricSeries;
  const columns = attributeColumns(series);
  const rows = sortByColumns(series, columns);
  const windowStart = Math.min(...series.map((row) => row.first_time));

  const [selectedIndex, select] = useSelection(rows, (row) => row.series_id);
  const selected = rows[selectedIndex];
  const detailed = useDeferredValue(selected);

  const { data: exemplars = [] } = useSeriesExemplars(metric, detailed?.series_id);
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
      ) : selected === undefined || detailed === undefined ? (
        <Placeholder text="This metric is no longer available" />
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
              key={detailed.series_id}
              ref={detailsRef}
              metric={metric}
              series={detailed}
              label={seriesLabel(detailed, columns)}
              windowStart={windowStart}
              windowMs={chartWindow}
            >
              <FocusScope
                focused={region === "exemplars"}
                onFocusRequest={() => focusRegion("exemplars")}
              >
                <ErrorBoundary
                  fallback={
                    <Description color={THEME.textError}>Failed to load exemplars</Description>
                  }
                >
                  <ExemplarList
                    metric={metric}
                    seriesId={detailed.series_id}
                    selectedIndex={exemplarIndex}
                    onSelect={(index) => selectExemplar(index)}
                  />
                </ErrorBoundary>
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
        {selected !== undefined && (
          <StepKeys
            forward="w"
            backward="shift+w"
            description="narrow the chart to a shorter window"
            backwardDescription="widen the chart window"
            onStep={(step) => setChartWindow((window) => cycle(CHART_WINDOWS, window, step))}
          >
            window
          </StepKeys>
        )}
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
