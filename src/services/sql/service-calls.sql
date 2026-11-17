WITH window_spans AS (
  SELECT
    trace_id,
    span_id,
    parent_span_id,
    service_name,
    kind,
    status_code,
    duration_time_unix_nano / 1e6 AS duration_ms,
    span_attributes AS attributes
  FROM otlp_traces
  WHERE service_name IS NOT NULL
    AND epoch_ms(start_time_unix_nano) >= $fromMs
), service_calls AS (
  SELECT
    parent.service_name AS caller,
    child.service_name AS callee,
    false AS is_external,
    child.status_code,
    child.duration_ms
  FROM window_spans AS child
  JOIN window_spans AS parent
    ON child.trace_id = parent.trace_id
    AND child.parent_span_id = parent.span_id
  WHERE child.service_name <> parent.service_name
), external_calls AS (
  SELECT
    service_name AS caller,
    coalesce(
      attributes::JSON ->> 'peer.service',
      attributes::JSON ->> 'db.system.name',
      attributes::JSON ->> 'db.system',
      attributes::JSON ->> 'messaging.system',
      attributes::JSON ->> 'server.address'
    ) AS callee,
    true AS is_external,
    status_code,
    duration_ms
  FROM window_spans AS span
  WHERE kind IN (3, 4)
    AND NOT EXISTS (
      SELECT 1
      FROM window_spans AS child
      WHERE child.trace_id = span.trace_id
        AND child.parent_span_id = span.span_id
        AND child.service_name <> span.service_name
    )
), calls AS (
  SELECT * FROM service_calls
  UNION ALL
  SELECT * FROM external_calls WHERE callee IS NOT NULL
)
SELECT
  hash(caller, callee, is_external)::VARCHAR AS call_id,
  caller,
  callee,
  is_external,
  count(*)::INTEGER AS span_count,
  count(*) / ($windowMs / 1000) AS rate,
  count(*) FILTER (WHERE status_code = 2) / count(*) AS error_ratio,
  quantile_cont(duration_ms, 0.5) AS p50_ms,
  quantile_cont(duration_ms, 0.95) AS p95_ms,
  quantile_cont(duration_ms, 0.99) AS p99_ms
FROM calls
GROUP BY caller, callee, is_external
ORDER BY caller, callee, is_external
