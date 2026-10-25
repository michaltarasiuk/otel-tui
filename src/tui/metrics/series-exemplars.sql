WITH metric_points AS MATERIALIZED (
  SELECT exemplars_json, resource_attributes, scope_name, scope_version, metric_attributes
  FROM otlp_metrics_gauge
  WHERE $type = 'gauge'
    AND name = $name
    AND unit = $unit
    AND service_name IS NOT DISTINCT FROM $serviceName
  UNION ALL
  SELECT exemplars_json, resource_attributes, scope_name, scope_version, metric_attributes
  FROM otlp_metrics_sum
  WHERE $type = CASE WHEN is_monotonic THEN 'counter' ELSE 'updowncounter' END
    AND aggregation_temporality = $temporality
    AND name = $name
    AND unit = $unit
    AND service_name IS NOT DISTINCT FROM $serviceName
  UNION ALL
  SELECT exemplars_json, resource_attributes, scope_name, scope_version, metric_attributes
  FROM otlp_metrics_histogram
  WHERE $type = 'histogram'
    AND aggregation_temporality = $temporality
    AND name = $name
    AND unit = $unit
    AND service_name IS NOT DISTINCT FROM $serviceName
  UNION ALL
  SELECT exemplars_json, resource_attributes, scope_name, scope_version, metric_attributes
  FROM otlp_metrics_exp_histogram
  WHERE $type = 'exponential_histogram'
    AND aggregation_temporality = $temporality
    AND name = $name
    AND unit = $unit
    AND service_name IS NOT DISTINCT FROM $serviceName
), exemplars AS (
  SELECT unnest(
    from_json(exemplars_json, '[{"time_unix_nano":"BIGINT","value":"DOUBLE","trace_id":"VARCHAR","span_id":"VARCHAR"}]'),
    recursive := true
  )
  FROM metric_points
  WHERE exemplars_json IS NOT NULL
    AND hash(resource_attributes, scope_name, scope_version, metric_attributes)::VARCHAR = $seriesId
)
SELECT
  make_timestamp(time_unix_nano // 1000) AS time,
  value,
  nullif(trace_id, '') AS trace_id,
  nullif(span_id, '') AS span_id
FROM exemplars
ORDER BY value DESC, time DESC
LIMIT $limit
