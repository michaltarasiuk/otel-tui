WITH metric_points AS MATERIALIZED (
  SELECT
    time_unix_nano,
    start_time_unix_nano,
    coalesce(double_value, int_value::DOUBLE) AS value,
    resource_attributes,
    scope_name,
    scope_version,
    metric_attributes
  FROM otlp_metrics_gauge
  WHERE $type = 'gauge'
    AND name = $name
    AND unit = $unit
    AND service_name IS NOT DISTINCT FROM $serviceName
  UNION ALL
  SELECT
    time_unix_nano,
    start_time_unix_nano,
    coalesce(double_value, int_value::DOUBLE),
    resource_attributes,
    scope_name,
    scope_version,
    metric_attributes
  FROM otlp_metrics_sum
  WHERE $type = CASE WHEN is_monotonic THEN 'counter' ELSE 'updowncounter' END
    AND aggregation_temporality = $temporality
    AND name = $name
    AND unit = $unit
    AND service_name IS NOT DISTINCT FROM $serviceName
)
SELECT
  time_unix_nano AS time,
  start_time_unix_nano AS start_time,
  value
FROM metric_points
WHERE hash(resource_attributes, scope_name, scope_version, metric_attributes)::VARCHAR = $seriesId
ORDER BY time
