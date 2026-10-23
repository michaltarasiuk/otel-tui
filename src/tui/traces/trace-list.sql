SELECT
  trace_id,
  min(start_time_unix_nano) AS start_time,
  arg_min(service_name, start_time_unix_nano) FILTER (WHERE parent_span_id IS NULL) AS service_name,
  arg_min(name, start_time_unix_nano) FILTER (WHERE parent_span_id IS NULL) AS name,
  count(*)::INTEGER AS span_count,
  count(*) FILTER (WHERE status_code = 2)::INTEGER AS error_count,
  (max(epoch_ns(start_time_unix_nano) + duration_time_unix_nano) - epoch_ns(start_time)) / 1e6 AS duration_ms,
  count(*) OVER ()::INTEGER AS total_count
FROM otlp_traces
GROUP BY trace_id
HAVING bool_or(parent_span_id IS NULL)
  AND (NOT $errorsOnly OR error_count > 0)
  AND (trace_id ILIKE $pattern OR bool_or(name ILIKE $pattern OR service_name ILIKE $pattern))
ORDER BY
  CASE $sortBy
    WHEN 'start_time' THEN epoch_us(start_time)
    WHEN 'duration_ms' THEN duration_ms
    WHEN 'span_count' THEN span_count
    WHEN 'error_count' THEN error_count
  END * $direction,
  start_time DESC
  LIMIT $limit
