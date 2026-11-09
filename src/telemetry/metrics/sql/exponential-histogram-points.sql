WITH metric_points AS MATERIALIZED (
  SELECT *
  FROM otlp_metrics_exp_histogram
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
    scale: scale,
    zero_count: zero_count::DOUBLE,
    zero_threshold: zero_threshold,
    positive_buckets: list_transform(
      positive_bucket_counts,
      lambda bucket_count, position: {index: positive_offset + position::INTEGER - 1, count: bucket_count::DOUBLE}
    ),
    negative_buckets: list_transform(
      negative_bucket_counts,
      lambda bucket_count, position: {index: negative_offset + position::INTEGER - 1, count: bucket_count::DOUBLE}
    )
  } AS distribution
FROM metric_points
WHERE hash(resource_attributes, scope_name, scope_version, metric_attributes)::VARCHAR = $seriesId
ORDER BY time
