SELECT trace_id, arg_min(name, start_time_unix_nano) AS name
FROM otlp_traces
WHERE parent_span_id IS NULL
GROUP BY trace_id
ORDER BY min(start_time_unix_nano) DESC
LIMIT $limit
