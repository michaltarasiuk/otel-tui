WITH points AS MATERIALIZED (
  SELECT
    hash(resource_attributes, scope_name, scope_version, metric_attributes)::VARCHAR AS series_id,
    time_unix_nano AS time,
    count::DOUBLE AS count,
    sum,
    min,
    max,
    scale,
    zero_count::DOUBLE AS zero_count,
    zero_threshold,
    list_transform(
      positive_bucket_counts,
      lambda bucket_count, position: {index: positive_offset + position::INTEGER - 1, count: bucket_count::DOUBLE}
    ) AS positive_buckets,
    list_transform(
      negative_bucket_counts,
      lambda bucket_count, position: {index: negative_offset + position::INTEGER - 1, count: bucket_count::DOUBLE}
    ) AS negative_buckets,
    resource_attributes,
    scope_name,
    scope_version,
    metric_attributes
  FROM otlp_metrics_exp_histogram
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
    max(max) AS max,
    min(scale) AS scale,
    sum(zero_count) AS zero_count,
    max(zero_threshold) AS zero_threshold
  FROM points
  GROUP BY series_id
), delta_buckets AS (
  SELECT
    series_id,
    list({index: bucket_index, count: bucket_count} ORDER BY bucket_index) FILTER (WHERE sign = 1) AS positive_buckets,
    list({index: bucket_index, count: bucket_count} ORDER BY bucket_index) FILTER (WHERE sign = -1) AS negative_buckets
  FROM (
    SELECT
      series_id,
      sign,
      bucket.index >> (point_scale - series.scale) AS bucket_index,
      sum(bucket.count) AS bucket_count
    FROM (
      SELECT series_id, scale AS point_scale, 1 AS sign, unnest(positive_buckets) AS bucket
      FROM points
      WHERE $temporality = 1
      UNION ALL
      SELECT series_id, scale, -1, unnest(negative_buckets)
      FROM points
      WHERE $temporality = 1
    )
    JOIN series USING (series_id)
    GROUP BY ALL
  )
  GROUP BY series_id
)
SELECT
  series_id,
  latest.scope_name,
  latest.scope_version,
  list_transform(
    map_entries(latest.metric_attributes::JSON::MAP(VARCHAR, JSON)),
    lambda attribute: {key: attribute.key, value: json_extract_string(attribute.value, '$')}
  ) AS attributes,
  list_transform(
    map_entries(latest.resource_attributes::JSON::MAP(VARCHAR, JSON)),
    lambda attribute: {key: attribute.key, value: json_extract_string(attribute.value, '$')}
  ) AS resource_attributes,
  first_time,
  last_time,
  CASE
    WHEN $temporality = 1 THEN {
      count: series.count,
      sum: series.sum,
      min: series.min,
      max: series.max,
      scale: series.scale,
      zero_count: series.zero_count,
      zero_threshold: series.zero_threshold,
      positive_buckets: delta_buckets.positive_buckets,
      negative_buckets: delta_buckets.negative_buckets
    }
    ELSE {
      count: latest.count,
      sum: latest.sum,
      min: latest.min,
      max: latest.max,
      scale: latest.scale,
      zero_count: latest.zero_count,
      zero_threshold: latest.zero_threshold,
      positive_buckets: latest.positive_buckets,
      negative_buckets: latest.negative_buckets
    }
  END AS stats
FROM series
LEFT JOIN delta_buckets USING (series_id)
