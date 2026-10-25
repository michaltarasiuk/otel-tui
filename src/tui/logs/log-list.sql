WITH recent_logs AS (
  SELECT *
  FROM otlp_logs
  WHERE coalesce(severity_number, 0) >= $minSeverityNumber
    AND ($traceId IS NULL OR trace_id = $traceId)
    AND (
      body ILIKE $pattern ESCAPE '\'
      OR event_name ILIKE $pattern ESCAPE '\'
      OR log_attributes ILIKE $pattern ESCAPE '\'
      OR service_name ILIKE $pattern ESCAPE '\'
      OR trace_id ILIKE $pattern ESCAPE '\'
    )
  ORDER BY coalesce(time_unix_nano, observed_time_unix_nano) DESC
  LIMIT $limit
), hashed_logs AS (
  SELECT hash(*COLUMNS(*)) AS content_hash, *
  FROM recent_logs
)
SELECT
  concat_ws('-', content_hash, row_number() OVER (PARTITION BY content_hash)) AS log_id,
  coalesce(time_unix_nano, observed_time_unix_nano) AS time,
  service_name,
  severity_number AS severity,
  severity_text,
  event_name,
  body,
  trace_id,
  span_id,
  scope_name,
  scope_version,
  list_transform(
    map_entries(log_attributes::JSON::MAP(VARCHAR, JSON)),
    attribute -> {key: attribute.key, value: json_extract_string(attribute.value, '$')}
  ) AS attributes,
  list_transform(
    map_entries(resource_attributes::JSON::MAP(VARCHAR, JSON)),
    attribute -> {key: attribute.key, value: json_extract_string(attribute.value, '$')}
  ) AS resource_attributes
FROM hashed_logs
ORDER BY time DESC, content_hash
