SELECT count(DISTINCT trace_id)::INTEGER AS total_count
FROM otlp_traces
WHERE parent_span_id IS NULL
