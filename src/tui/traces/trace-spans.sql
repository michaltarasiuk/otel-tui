WITH RECURSIVE trace_spans AS (
  SELECT
    span_id,
    parent_span_id,
    service_name,
    name,
    kind,
    status_code,
    status_status_message,
    start_time_unix_nano,
    duration_time_unix_nano
  FROM otlp_traces
  WHERE trace_id = $traceId
), span_tree AS (
  SELECT
    *,
    0 AS depth,
    [{start: start_time_unix_nano, id: span_id}] AS path
  FROM trace_spans
  WHERE parent_span_id IS NULL
    OR parent_span_id NOT IN (SELECT span_id FROM trace_spans)
  UNION ALL
  SELECT
    child.*,
    parent.depth + 1,
    list_append(parent.path, {start: child.start_time_unix_nano, id: child.span_id})
  FROM trace_spans AS child
  JOIN span_tree AS parent ON child.parent_span_id = parent.span_id
)
SELECT
  span_id,
  parent_span_id,
  depth,
  service_name,
  name,
  kind,
  status_code = 2 AS is_error,
  status_status_message AS status_message,
  start_time_unix_nano AS start_time,
  (epoch_ns(start_time_unix_nano) - min(epoch_ns(start_time_unix_nano)) OVER ()) / 1e6 AS offset_ms,
  duration_time_unix_nano / 1e6 AS duration_ms
FROM span_tree
ORDER BY path
