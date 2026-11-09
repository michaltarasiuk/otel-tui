WITH points AS MATERIALIZED (
  SELECT
    hash(resource_attributes, scope_name, scope_version, metric_attributes)::VARCHAR AS series_id,
    time_unix_nano AS time,
    count::DOUBLE AS count,
    sum,
    min,
    max,
    bucket_counts::DOUBLE[] AS bucket_counts,
    explicit_bounds,
    resource_attributes,
    scope_name,
    scope_version,
    metric_attributes
  FROM otlp_metrics_histogram
  WHERE name = $name
    AND unit = $unit
    AND service_name IS NOT DISTINCT FROM $serviceName
    AND aggregation_temporality = $temporality
), series AS (
  SELECT
    series_id,
    arg_max(points, time) AS latest,
    min(time) AS first_time,
    max(time) AS last_time,
    sum(count) AS count,
    sum(sum) AS sum,
    min(min) AS min,
    max(max) AS max
  FROM points
  GROUP BY series_id
), delta_buckets AS (
  SELECT series_id, list(bucket_count ORDER BY bucket_index) AS bucket_counts
  FROM (
    SELECT series_id, bucket_index, sum(bucket_count) AS bucket_count
    FROM (
      SELECT
        points.series_id,
        unnest(points.bucket_counts) AS bucket_count,
        generate_subscripts(points.bucket_counts, 1) AS bucket_index
      FROM points
      JOIN series USING (series_id)
      WHERE $temporality = 1 AND points.explicit_bounds = series.latest.explicit_bounds
    )
    GROUP BY series_id, bucket_index
  )
  GROUP BY series_id
)
SELECT
  series_id,
  latest.scope_name,
  latest.scope_version,
  attribute_entries(latest.metric_attributes) AS attributes,
  attribute_entries(latest.resource_attributes) AS resource_attributes,
  first_time,
  last_time,
  CASE
    WHEN $temporality = 1 THEN {
      count: series.count,
      sum: series.sum,
      min: series.min,
      max: series.max,
      bounds: latest.explicit_bounds,
      bucket_counts: coalesce(delta_buckets.bucket_counts, [])
    }
    ELSE {
      count: latest.count,
      sum: latest.sum,
      min: latest.min,
      max: latest.max,
      bounds: latest.explicit_bounds,
      bucket_counts: latest.bucket_counts
    }
  END AS stats
FROM series
LEFT JOIN delta_buckets USING (series_id)
