export function formatTimeOfDay(
  epochMs: number,
  precision: "minute" | "second" | "millisecond" = "millisecond",
) {
  return Temporal.Instant.fromEpochMilliseconds(epochMs)
    .toZonedDateTimeISO(Temporal.Now.timeZoneId())
    .toPlainTime()
    .toString({ smallestUnit: precision });
}
