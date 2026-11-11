import { DAY_MS, HOUR_MS, MINUTE_MS, SECOND_MS, formatDuration } from "#utils/time.ts";
import { formatBytes } from "#utils/units.ts";

const MILLISECONDS_PER_UNIT: Record<string, number> = {
  ns: 1e-6,
  us: 1e-3,
  ms: 1,
  s: SECOND_MS,
  min: MINUTE_MS,
  h: HOUR_MS,
  d: DAY_MS,
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

const dimensionlessUnits = new Set(["", "1"]);
const ANNOTATION_UNIT = /^\{[^}]*\}$/;

const COMPACT_FROM = 1e6;
const ROUND_FROM = 1000;

const compactFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumSignificantDigits: 3,
});
const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const fractionFormatter = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 3 });

function formatNumber(value: number) {
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= COMPACT_FROM) {
    return compactFormatter.format(value);
  }
  if (absoluteValue >= ROUND_FROM || Number.isInteger(value)) {
    return integerFormatter.format(value);
  }
  return fractionFormatter.format(value);
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
  if (dimensionlessUnits.has(unit) || ANNOTATION_UNIT.test(unit)) {
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
