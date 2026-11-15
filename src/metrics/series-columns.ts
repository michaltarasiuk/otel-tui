import { clamp } from "#utils/number.ts";
import { compareText } from "#utils/text.ts";

import { type AttributeValues, attributeValues } from "./attribute-values.ts";
import type { Series } from "./series.ts";

const MIN_COLUMN_WEIGHT = 8;
const MAX_COLUMN_WEIGHT = 32;

const ATTRIBUTE_SOURCES = ["attributes", "resource_attributes"] as const;

const LABEL_SEPARATOR = " · ";
const UNLABELED_SERIES = "no attributes";

type AttributeSource = (typeof ATTRIBUTE_SOURCES)[number];

export interface AttributeColumn {
  key: string;
  source: AttributeSource;
  weight: number;
}

export function attributeColumns(series: Series[]) {
  if (series.length === 1) {
    const attributes = attributeValues(series.map((row) => row.attributes));
    return toColumns("attributes", attributes);
  }

  return ATTRIBUTE_SOURCES.flatMap((source) => {
    const attributes = attributeValues(series.map((row) => row[source]));
    const distinguishing = attributes.filter((attribute) => tellsApart(attribute, series.length));
    return toColumns(source, distinguishing);
  });
}

function tellsApart({ values, count }: AttributeValues, seriesCount: number) {
  return values.length > 1 || count < seriesCount;
}

function toColumns(source: AttributeSource, attributes: AttributeValues[]) {
  return attributes
    .toSorted((a, b) => a.values.length - b.values.length || a.key.localeCompare(b.key))
    .map(({ key, values }) => ({ key, source, weight: columnWeight(values) }));
}

function columnWeight(values: string[]) {
  const longest = Math.max(...values.map((value) => value.length));
  return clamp(longest, MIN_COLUMN_WEIGHT, MAX_COLUMN_WEIGHT);
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
      const order = compareText(cellValue(a, column), cellValue(b, column));
      if (order !== 0) {
        return order;
      }
    }

    return a.series_id.localeCompare(b.series_id);
  });
}
