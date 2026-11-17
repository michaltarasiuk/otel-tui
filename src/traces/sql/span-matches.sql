SELECT span_id
FROM otlp_traces
WHERE trace_id = $traceId
  AND matches_filters($attributes, json_object('duration', duration_time_unix_nano / 1e6), span_attributes, resource_attributes)
  AND (
    name ILIKE $pattern ESCAPE '\'
    OR service_name ILIKE $pattern ESCAPE '\'
    OR span_id ILIKE $pattern ESCAPE '\'
    OR span_attributes ILIKE $pattern ESCAPE '\'
    OR status_status_message ILIKE $pattern ESCAPE '\'
  )
