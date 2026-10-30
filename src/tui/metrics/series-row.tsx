import { HEADER_CELL_PROPS, secondaryCellColor } from "../columns.ts";
import { IGNORE_CONTENT_SIZE } from "../flex.ts";
import { TableRow } from "../table-row.tsx";
import { THEME } from "../theme.ts";
import type { Metric } from "./metric.ts";
import { type AttributeColumn, cellValue } from "./series-columns.ts";
import { seriesStats, statKeys, statLabel } from "./series-stats.ts";
import type { Series } from "./series.ts";

const STAT_WIDTH = 10;

interface SeriesHeaderRowProps {
  metric: Metric;
  columns: AttributeColumn[];
}

export function SeriesHeaderRow({ metric, columns }: SeriesHeaderRowProps) {
  return (
    <TableRow>
      {columns.length === 0 ? (
        <text {...HEADER_CELL_PROPS} flexGrow={1}>
          Attributes
        </text>
      ) : (
        columns.map(({ key, source, weight }) => (
          <text
            key={`${source}.${key}`}
            {...HEADER_CELL_PROPS}
            flexGrow={weight}
            flexBasis={IGNORE_CONTENT_SIZE}
            wrapMode="none"
            truncate
          >
            {key}
          </text>
        ))
      )}
      {statKeys(metric.type).map((key) => (
        <text key={key} {...HEADER_CELL_PROPS} width={STAT_WIDTH} textAlign="right">
          {statLabel(key)}
        </text>
      ))}
    </TableRow>
  );
}

interface SeriesRowProps {
  metric: Metric;
  columns: AttributeColumn[];
  series: Series;
  selected: boolean;
}

export function SeriesRow({ metric, columns, series, selected }: SeriesRowProps) {
  const stats = seriesStats(metric, series);

  return (
    <TableRow selected={selected}>
      {columns.length === 0 ? (
        <text flexGrow={1} fg={secondaryCellColor(selected)}>
          none
        </text>
      ) : (
        columns.map((column) => (
          <text
            key={`${column.source}.${column.key}`}
            flexGrow={column.weight}
            flexBasis={IGNORE_CONTENT_SIZE}
            fg={THEME.text}
            wrapMode="none"
            truncate
          >
            {cellValue(series, column)}
          </text>
        ))
      )}
      {statKeys(metric.type).map((key) => (
        <text key={key} width={STAT_WIDTH} textAlign="right" fg={THEME.text}>
          {stats[key]}
        </text>
      ))}
    </TableRow>
  );
}
