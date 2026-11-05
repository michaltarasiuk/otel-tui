WITH metric_points AS MATERIALIZED (
  SELECT *
  FROM otlp_metrics_histogram
  WHERE name = $name
    AND unit = $unit
    AND service_name IS NOT DISTINCT FROM $serviceName
    AND aggregation_temporality = $temporality
)
SELECT
  time_unix_nano AS time,
  start_time_unix_nano AS start_time,
  {
    count: count::DOUBLE,
    sum: sum,
    min: min,
    max: max,
    bounds: explicit_bounds,
    bucket_counts: bucket_counts::DOUBLE[]
  } AS distribution
FROM metric_points
WHERE hash(resource_attributes, scope_name, scope_version, metric_attributes)::VARCHAR = $seriesId
ORDER BY time
