WITH entry_spans AS (
  SELECT service_name, status_code, duration_time_unix_nano / 1e6 AS duration_ms
  FROM otlp_traces
  WHERE kind IN (2, 5)
    AND service_name IS NOT NULL
    AND epoch_ms(start_time_unix_nano) >= $fromMs
), services AS (
  SELECT
    service_name,
    count(*)::INTEGER AS span_count,
    count(*) / ($windowMs / 1000) AS rate,
    count(*) FILTER (WHERE status_code = 2) / count(*) AS error_ratio,
    quantile_cont(duration_ms, 0.5) AS p50_ms,
    quantile_cont(duration_ms, 0.95) AS p95_ms,
    quantile_cont(duration_ms, 0.99) AS p99_ms
  FROM entry_spans
  WHERE service_name ILIKE $pattern ESCAPE '\'
  GROUP BY service_name
)
SELECT *
FROM services
ORDER BY
  CASE $sortBy
    WHEN 'rate' THEN rate
    WHEN 'error_ratio' THEN error_ratio
    WHEN 'p95_ms' THEN p95_ms
  END * $direction,
  service_name
