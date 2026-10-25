SELECT count(*)::INTEGER AS total_count
FROM (
  SELECT DISTINCT 'gauge' AS type, NULL::INTEGER AS temporality, name, unit, service_name
  FROM otlp_metrics_gauge
  UNION ALL
  SELECT DISTINCT CASE WHEN is_monotonic THEN 'counter' ELSE 'updowncounter' END, aggregation_temporality, name, unit, service_name
  FROM otlp_metrics_sum
  UNION ALL
  SELECT DISTINCT 'histogram', aggregation_temporality, name, unit, service_name
  FROM otlp_metrics_histogram
  UNION ALL
  SELECT DISTINCT 'exponential_histogram', aggregation_temporality, name, unit, service_name
  FROM otlp_metrics_exp_histogram
)
