import type { ScrollBoxRenderable } from "@opentui/core";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useDeferredValue, useRef, useState } from "react";

import { useConnection } from "#query/connection.ts";
import { Description } from "#ui/details.tsx";
import { ErrorBoundary } from "#ui/error-boundary.tsx";
import { FocusScope } from "#ui/focus.tsx";
import { Key, KeyHints, StepKeys } from "#ui/key-hints.tsx";
import { PauseKey } from "#ui/pause.tsx";
import { Placeholder } from "#ui/placeholder.tsx";
import { RegionKeys, useRegion } from "#ui/region.tsx";
import { ScrollKeys } from "#ui/scroll-box.tsx";
import { Split } from "#ui/split.tsx";
import { THEME } from "#ui/theme.ts";
import { useSelection } from "#ui/use-selection.ts";
import { cycle } from "#utils/cycle.ts";
import { MINUTE_MS } from "#utils/time.ts";

import { ExemplarList } from "./exemplar-list.tsx";
import { MetricHeader } from "./metric-header.tsx";
import { metricSeriesQuery, seriesExemplarsQuery } from "./metric-queries.ts";
import type { Metric } from "./metric.ts";
import { attributeColumns, seriesLabel, sortByColumns } from "./series-columns.ts";
import { SeriesDetails } from "./series-details.tsx";
import { SeriesTable } from "./series-table.tsx";

const CHART_WINDOWS = [undefined, 15 * MINUTE_MS, 5 * MINUTE_MS, MINUTE_MS] as const;

interface MetricSeriesPageProps {
  metric: Metric;
  onBack: () => void;
  onOpenTrace: (traceId: string, spanId: string | undefined) => void;
}

export function MetricSeriesPage({ metric, onBack, onOpenTrace }: MetricSeriesPageProps) {
  const [chartWindow, setChartWindow] = useState<(typeof CHART_WINDOWS)[number]>();

  const connection = useConnection();
  const metricSeries = useSuspenseQuery(metricSeriesQuery(connection, metric));
  const { data: series } = metricSeries;
  const columns = attributeColumns(series);
  const rows = sortByColumns(series, columns);
  const windowStart = Math.min(...series.map((row) => row.first_time));

  const [selectedIndex, select] = useSelection(rows, (row) => row.series_id);
  const selected = rows[selectedIndex];
  const deferredSelected = useDeferredValue(selected);

  const seriesId = deferredSelected?.series_id;
  const exemplarsOptions = seriesExemplarsQuery(connection, metric, seriesId);
  const { data: exemplars = [] } = useQuery({
    ...exemplarsOptions,
    enabled: seriesId !== undefined,
  });
  const [exemplarIndex, selectExemplar] = useSelection(
    exemplars,
    (exemplar) => exemplar.exemplar_id,
  );
  const exemplar = exemplars[exemplarIndex];
  const exemplarTraceId = exemplar?.has_trace === true ? exemplar.trace_id : null;

  const regions = exemplars.length > 0 ? (["series", "exemplars"] as const) : (["series"] as const);
  const [region, setRegion] = useRegion(regions);

  const detailsRef = useRef<ScrollBoxRenderable>(null);

  return (
    <box flexGrow={1}>
      {metricSeries.isError ? (
        <Placeholder text="Failed to load metric" variant="error" />
      ) : selected === undefined || deferredSelected === undefined ? (
        <Placeholder text="This metric is no longer available" />
      ) : (
        <>
          <box paddingX={1}>
            <MetricHeader metric={metric} seriesCount={series.length} />
          </box>
          <Split>
            <FocusScope focused={region === "series"} onFocusRequest={() => setRegion("series")}>
              <SeriesTable
                series={rows}
                selectedIndex={selectedIndex}
                onSelect={(action) => select(action)}
                metric={metric}
                columns={columns}
              />
            </FocusScope>
            <SeriesDetails
              key={deferredSelected.series_id}
              ref={detailsRef}
              metric={metric}
              series={deferredSelected}
              label={seriesLabel(deferredSelected, columns)}
              windowStart={windowStart}
              windowMs={chartWindow}
            >
              <FocusScope
                focused={region === "exemplars"}
                onFocusRequest={() => setRegion("exemplars")}
              >
                <ErrorBoundary
                  fallback={
                    <Description color={THEME.textError}>Failed to load exemplars</Description>
                  }
                >
                  <ExemplarList
                    metric={metric}
                    seriesId={deferredSelected.series_id}
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
        <RegionKeys regions={regions} region={region} onChange={(region) => setRegion(region)} />
      </KeyHints>
    </box>
  );
}
