import { expect, test } from "bun:test";

import { parseDuration } from "./parse-duration.ts";

test("reads a duration in milliseconds", () => {
  expect(parseDuration("100ns")).toBeCloseTo(0.0001);
  expect(parseDuration("250us")).toBe(0.25);
  expect(parseDuration("250µs")).toBe(0.25);
  expect(parseDuration("500ms")).toBe(500);
  expect(parseDuration("1.5s")).toBe(1500);
  expect(parseDuration("2m")).toBe(120_000);
  expect(parseDuration("1h")).toBe(3_600_000);
});

test("takes a bare number as milliseconds", () => {
  expect(parseDuration("500")).toBe(500);
});

test("rejects anything else", () => {
  expect(parseDuration("")).toBeUndefined();
  expect(parseDuration("fast")).toBeUndefined();
  expect(parseDuration("5 ms")).toBeUndefined();
  expect(parseDuration("-5ms")).toBeUndefined();
  expect(parseDuration("5d")).toBeUndefined();
});
