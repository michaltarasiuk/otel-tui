import { formatDuration } from "../../utils/format-duration.ts";
import {
  MILLISECONDS_PER_DAY,
  MILLISECONDS_PER_HOUR,
  MILLISECONDS_PER_MINUTE,
  MILLISECONDS_PER_SECOND,
} from "../../utils/time-units.ts";

const MILLISECONDS_PER_UNIT: Record<string, number> = {
  ns: 1e-6,
  us: 1e-3,
  ms: 1,
  s: MILLISECONDS_PER_SECOND,
  min: MILLISECONDS_PER_MINUTE,
  h: MILLISECONDS_PER_HOUR,
  d: MILLISECONDS_PER_DAY,
};

const BYTES_PER_UNIT: Record<string, number> = {
  By: 1,
  kBy: 1e3,
  MBy: 1e6,
  GBy: 1e9,
  TBy: 1e12,
  KiBy: 1024,
  MiBy: 1024 ** 2,
  GiBy: 1024 ** 3,
  TiBy: 1024 ** 4,
};

const BYTE_UNITS = ["B", "KiB", "MiB", "GiB", "TiB"] as const;
const BYTES_PER_STEP = 1024;

const DIMENSIONLESS_UNITS = new Set(["", "1"]);
const ANNOTATION_UNIT = /^\{[^}]*\}$/;
const COMPACT_THRESHOLD = 1e6;
const GROUPING_THRESHOLD = 1000;

const compactFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumSignificantDigits: 3,
});
const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const fractionFormatter = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 3 });

function formatNumber(value: number) {
  const magnitude = Math.abs(value);
  if (magnitude >= COMPACT_THRESHOLD) {
    return compactFormatter.format(value);
  }
  if (magnitude >= GROUPING_THRESHOLD || Number.isInteger(value)) {
    return integerFormatter.format(value);
  }
  return fractionFormatter.format(value);
}

function roundToTenths(value: number) {
  return Math.round(value * 10) / 10;
}

function formatBytes(bytes: number) {
  let exponent = 0;
  while (
    exponent < BYTE_UNITS.length - 1 &&
    roundToTenths(bytes / BYTES_PER_STEP ** exponent) >= BYTES_PER_STEP
  ) {
    exponent++;
  }
  if (exponent === 0) {
    return `${Math.round(bytes)} B`;
  }
  return `${(bytes / BYTES_PER_STEP ** exponent).toFixed(1)} ${BYTE_UNITS[exponent]}`;
}

export function formatMetricValue(value: number, unit: string): string {
  if (value < 0) {
    return `-${formatMetricValue(-value, unit)}`;
  }
  const milliseconds = MILLISECONDS_PER_UNIT[unit];
  if (milliseconds !== undefined) {
    return formatDuration(value * milliseconds);
  }
  const bytes = BYTES_PER_UNIT[unit];
  if (bytes !== undefined) {
    return formatBytes(value * bytes);
  }
  if (DIMENSIONLESS_UNITS.has(unit) || ANNOTATION_UNIT.test(unit)) {
    return formatNumber(value);
  }
  if (unit === "%") {
    return `${formatNumber(value)}%`;
  }
  return `${formatNumber(value)} ${unit}`;
}

export function formatMetricRate(perSecond: number, unit: string) {
  return `${formatMetricValue(perSecond, unit)}/s`;
}
