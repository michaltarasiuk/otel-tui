WITH series AS (
  SELECT
    'gauge' AS type,
    NULL::INTEGER AS temporality,
    name,
    unit,
    service_name,
    any_value(metric_attributes) AS metric_attributes,
    arg_max(description, time_unix_nano) AS description,
    max(time_unix_nano) AS last_time
  FROM otlp_metrics_gauge
  GROUP BY name, unit, service_name, hash(resource_attributes, scope_name, scope_version, metric_attributes)
  UNION ALL
  SELECT
    CASE WHEN is_monotonic THEN 'counter' ELSE 'updowncounter' END,
    aggregation_temporality,
    name,
    unit,
    service_name,
    any_value(metric_attributes),
    arg_max(description, time_unix_nano),
    max(time_unix_nano)
  FROM otlp_metrics_sum
  GROUP BY is_monotonic, aggregation_temporality, name, unit, service_name, hash(resource_attributes, scope_name, scope_version, metric_attributes)
  UNION ALL
  SELECT
    'histogram',
    aggregation_temporality,
    name,
    unit,
    service_name,
    any_value(metric_attributes),
    arg_max(description, time_unix_nano),
    max(time_unix_nano)
  FROM otlp_metrics_histogram
  GROUP BY aggregation_temporality, name, unit, service_name, hash(resource_attributes, scope_name, scope_version, metric_attributes)
  UNION ALL
  SELECT
    'exponential_histogram',
    aggregation_temporality,
    name,
    unit,
    service_name,
    any_value(metric_attributes),
    arg_max(description, time_unix_nano),
    max(time_unix_nano)
  FROM otlp_metrics_exp_histogram
  GROUP BY aggregation_temporality, name, unit, service_name, hash(resource_attributes, scope_name, scope_version, metric_attributes)
), metrics AS (
  SELECT
    hash(type, temporality, name, unit, service_name)::VARCHAR AS metric_id,
    type,
    temporality,
    name,
    unit,
    service_name,
    arg_max(description, last_time) AS description,
    max(last_time) AS last_time,
    count(*)::INTEGER AS series_count
  FROM series
  GROUP BY type, temporality, name, unit, service_name
  HAVING name ILIKE $pattern ESCAPE '\'
    OR service_name ILIKE $pattern ESCAPE '\'
    OR description ILIKE $pattern ESCAPE '\'
    OR bool_or(metric_attributes ILIKE $pattern ESCAPE '\')
)
SELECT *
FROM metrics
ORDER BY
  CASE $sortBy
    WHEN 'name' THEN row_number() OVER (ORDER BY name, service_name, type, unit)
    WHEN 'series_count' THEN series_count
    WHEN 'last_time' THEN epoch_us(last_time)
  END * $direction,
  name,
  service_name
LIMIT $limit
