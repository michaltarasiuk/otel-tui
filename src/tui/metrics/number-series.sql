WITH points AS MATERIALIZED (
  SELECT
    hash(resource_attributes, scope_name, scope_version, metric_attributes)::VARCHAR AS series_id,
    time_unix_nano AS time,
    start_time_unix_nano AS start_time,
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
    hash(resource_attributes, scope_name, scope_version, metric_attributes)::VARCHAR,
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
), totals AS (
  SELECT
    *,
    CASE
      WHEN $temporality = 1 THEN sum(value) OVER (PARTITION BY series_id ORDER BY time)
      ELSE value
    END AS total
  FROM points
)
SELECT
  series_id,
  any_value(scope_name) AS scope_name,
  any_value(scope_version) AS scope_version,
  list_transform(
    map_entries(any_value(metric_attributes)::JSON::MAP(VARCHAR, JSON)),
    lambda attribute: {key: attribute.key, value: json_extract_string(attribute.value, '$')}
  ) AS attributes,
  list_transform(
    map_entries(any_value(resource_attributes)::JSON::MAP(VARCHAR, JSON)),
    lambda attribute: {key: attribute.key, value: json_extract_string(attribute.value, '$')}
  ) AS resource_attributes,
  min(time) AS first_time,
  max(time) AS last_time,
  {
    value: arg_max(total, time),
    min: min(total),
    max: max(total),
    latest_points: arg_max({time: time, start_time: start_time, value: value}, time, 2)
  } AS stats
FROM totals
GROUP BY series_id
