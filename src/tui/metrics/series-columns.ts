import { clamp } from "../../utils/clamp.ts";
import { attributeValues, compareValues } from "./series-attributes.ts";
import type { Series } from "./series.ts";

const MIN_COLUMN_WEIGHT = 8;
const MAX_COLUMN_WEIGHT = 32;
const SOURCES = ["attributes", "resource_attributes"] as const;
const LABEL_SEPARATOR = " · ";
const UNLABELED_SERIES = "no attributes";

export interface AttributeColumn {
  key: string;
  source: "attributes" | "resource_attributes";
  weight: number;
}

export function attributeColumns(series: Series[]) {
  const sources = series.length === 1 ? (["attributes"] as const) : SOURCES;
  return sources.flatMap((source) =>
    attributeValues(series.map((row) => row[source]))
      .filter(
        ({ values, setCount }) =>
          series.length === 1 || values.length > 1 || setCount < series.length,
      )
      .toSorted((a, b) => a.values.length - b.values.length || a.key.localeCompare(b.key))
      .map(({ key, values }) => ({
        key,
        source,
        weight: clamp(
          Math.max(...values.map((value) => value.length)),
          MIN_COLUMN_WEIGHT,
          MAX_COLUMN_WEIGHT,
        ),
      })),
  );
}

export function cellValue(series: Series, { key, source }: AttributeColumn) {
  return series[source].find((attribute) => attribute.key === key)?.value ?? "";
}

export function seriesLabel(series: Series, columns: AttributeColumn[]) {
  const label = columns
    .map((column) => cellValue(series, column))
    .filter((value) => value !== "")
    .join(LABEL_SEPARATOR);
  return label === "" ? UNLABELED_SERIES : label;
}

export function sortByColumns(series: Series[], columns: AttributeColumn[]) {
  return series.toSorted((a, b) => {
    for (const column of columns) {
      const order = compareValues(cellValue(a, column), cellValue(b, column));
      if (order !== 0) {
        return order;
      }
    }
    return a.series_id.localeCompare(b.series_id);
  });
}
