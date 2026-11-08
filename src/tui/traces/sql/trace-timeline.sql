WITH traces AS (
  SELECT
    epoch_ms(min(start_time_unix_nano)) AS start_ms,
    bool_or(status_code = 2) AS has_error
  FROM otlp_traces
  GROUP BY trace_id
  HAVING bool_or(parent_span_id IS NULL)
    AND (NOT $errorsOnly OR has_error)
    AND (trace_id ILIKE $pattern ESCAPE '\' OR bool_or(name ILIKE $pattern ESCAPE '\' OR service_name ILIKE $pattern ESCAPE '\'))
    AND bool_or(matches_attributes($attributes, span_attributes, resource_attributes))
)
SELECT
  (floor(start_ms / $bucketMs) * $bucketMs)::DOUBLE AS bucket_start_ms,
  count(*)::INTEGER AS trace_count,
  count(*) FILTER (WHERE has_error)::INTEGER AS error_count
FROM traces
WHERE start_ms < $endMs
GROUP BY ALL
ORDER BY bucket_start_ms
