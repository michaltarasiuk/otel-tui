SELECT
  name,
  count(*)::INTEGER AS span_count,
  count(*) / ($windowMs / 1000) AS rate,
  count(*) FILTER (WHERE status_code = 2) / count(*) AS error_ratio,
  quantile_cont(duration_time_unix_nano / 1e6, 0.95) AS p95_ms
FROM otlp_traces
WHERE kind IN (2, 5)
  AND service_name = $serviceName
  AND epoch_ms(start_time_unix_nano) >= $fromMs
GROUP BY name
ORDER BY rate DESC, name
LIMIT $limit
