# otel-tui

A terminal app for viewing OpenTelemetry traces, metrics, and logs.

It receives data over OTLP/HTTP, stores it in DuckDB, and shows it in views that
filter each other. [OpenTUI](https://opentui.com/) draws the screen.

## How it works

The app opens an in-memory DuckDB and starts the receiver of its
[`otlp` community extension](https://duckdb.org/community_extensions/extensions/otlp)
on port 4318 (`OTEL_TUI_PORT` overrides it). The data lands in the `otlp_traces`,
`otlp_logs` and `otlp_metrics_*` tables. Views query DuckDB, and OpenTUI shows
the results.

- The extension commits rows in batches (every 500 ms here), so call `flush()`
  from `src/db/receiver.ts` to see fresh data immediately.
- Auth is disabled, so the receiver only suits local use.

- A small store holds the shared filters (service, time range, search text).
  Each view builds its SQL from the filters and re-queries when they change, so
  choosing a service or time range in one view filters the others.
- The runtime is Bun, because OpenTUI needs it.

## Views

- Traces: span table, waterfall, duration histogram.
- Metrics: line chart with a time brush.
- Logs: table, severity histogram, text search.

## Project layout

- `src/db/`: DuckDB instance and OTLP receiver.
- `src/tui/`: views and charts.

## Next steps

1. Build the Logs, Traces, and Metrics views.

## Development

Sample data comes from OpenTelemetry's
[`telemetrygen`](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/cmd/telemetrygen)
(`go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest`):

```shell
bun run start        # in one terminal
bun run gen:traces   # in another (also gen:logs, gen:metrics)
```

```shell
bun run check
bun run test
```
