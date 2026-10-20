# otel-tui

A terminal app for viewing OpenTelemetry traces, metrics, and logs.

It receives data over OTLP/HTTP, stores it in DuckDB, and shows it in views that
filter each other. [Mosaic](https://idl.uw.edu/mosaic/) runs the queries and
[OpenTUI](https://opentui.com/) draws the screen.

## How it works

The app opens an in-memory DuckDB and starts the receiver of its
[`otlp` community extension](https://duckdb.org/community_extensions/extensions/otlp)
on port 4318 (`OTEL_TUI_PORT` overrides it). The data lands in the `otlp_traces`,
`otlp_logs` and `otlp_metrics_*` tables. Mosaic queries DuckDB, and OpenTUI shows
the results.

- The extension commits rows in batches (every 500 ms here), so call `flush()`
  from `src/db/receiver.ts` to see fresh data immediately.
- Summary metrics are not supported, and the receiver does not run in WASM.
- Auth is disabled, so the receiver only suits local use.

- Mosaic's charting library needs a browser, so we use only its query layer.
  The charts are OpenTUI components.
- Each view is a Mosaic client. Views share selections, so choosing a service
  or time range in one view filters the others.
- The runtime is Bun, because OpenTUI needs it.

## Views

- Traces: span table, waterfall, duration histogram.
- Metrics: line chart with a time brush.
- Logs: table, severity histogram, text search.

## Project layout

- `src/db/`: DuckDB instance, OTLP receiver and Mosaic connector.
- `src/tui/`: views and charts.

## Next steps

1. Install OpenTUI and Mosaic, and check that they work with DuckDB on Bun.
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
