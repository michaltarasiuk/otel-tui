import { expect, test } from "bun:test";

import { formatBytes, formatInUnits, type Unit } from "./units.ts";

const DISTANCE: [Unit, ...Unit[]] = [
  { suffix: " m", size: 1, digits: 0 },
  { suffix: " km", size: 1000, digits: 1 },
];

test("formatInUnits stays in the smallest unit that fits", () => {
  expect(formatInUnits(0, DISTANCE)).toBe("0 m");
  expect(formatInUnits(999.4, DISTANCE)).toBe("999 m");
  expect(formatInUnits(1500, DISTANCE)).toBe("1.5 km");
});

test("formatInUnits rounds before choosing the unit", () => {
  expect(formatInUnits(999.6, DISTANCE)).toBe("1.0 km");
});

test("formatInUnits keeps growing in the largest unit", () => {
  expect(formatInUnits(5_000_000, DISTANCE)).toBe("5000.0 km");
});

test("formatBytes uses binary units", () => {
  expect(formatBytes(512)).toBe("512 B");
  expect(formatBytes(1000)).toBe("1000 B");
  expect(formatBytes(1023.96)).toBe("1.0 KiB");
  expect(formatBytes(1536)).toBe("1.5 KiB");
  expect(formatBytes(2 * 1024 ** 2)).toBe("2.0 MiB");
  expect(formatBytes(2048 * 1024 ** 4)).toBe("2048.0 TiB");
});
