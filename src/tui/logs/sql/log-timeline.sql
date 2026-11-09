WITH logs AS (
  SELECT
    epoch_ms(coalesce(time_unix_nano, observed_time_unix_nano)) AS time_ms,
    coalesce(severity_number, 0) >= $errorSeverityNumber AS is_error
  FROM otlp_logs
  WHERE coalesce(severity_number, 0) >= $minSeverityNumber
    AND ($traceId IS NULL OR trace_id = $traceId)
    AND ($spanId IS NULL OR span_id = $spanId)
    AND matches_attributes($attributes, log_attributes, resource_attributes)
    AND (
      body ILIKE $pattern ESCAPE '\'
      OR event_name ILIKE $pattern ESCAPE '\'
      OR log_attributes ILIKE $pattern ESCAPE '\'
      OR service_name ILIKE $pattern ESCAPE '\'
      OR trace_id ILIKE $pattern ESCAPE '\'
    )
)
SELECT
  (floor(time_ms / $bucketMs) * $bucketMs)::DOUBLE AS bucket_start_ms,
  count(*)::INTEGER AS count,
  count(*) FILTER (WHERE is_error)::INTEGER AS error_count
FROM logs
WHERE time_ms < $endMs
GROUP BY ALL
ORDER BY bucket_start_ms
