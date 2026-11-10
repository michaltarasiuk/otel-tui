import { round } from "./number.ts";

export interface Unit {
  suffix: string;
  size: number;
  digits: number;
}

const BYTE_UNITS: readonly [Unit, ...Unit[]] = [
  { suffix: " B", size: 1, digits: 0 },
  { suffix: " KiB", size: 1024, digits: 1 },
  { suffix: " MiB", size: 1024 ** 2, digits: 1 },
  { suffix: " GiB", size: 1024 ** 3, digits: 1 },
  { suffix: " TiB", size: 1024 ** 4, digits: 1 },
];

export function formatInUnits(value: number, units: readonly [Unit, ...Unit[]]) {
  let [unit] = units;
  for (const next of units.slice(1)) {
    if (round(value / unit.size, unit.digits) < next.size / unit.size) {
      break;
    }
    unit = next;
  }
  const scaled = round(value / unit.size, unit.digits);
  return `${scaled.toFixed(unit.digits)}${unit.suffix}`;
}

export function formatBytes(bytes: number) {
  return formatInUnits(bytes, BYTE_UNITS);
}
