WITH span AS (
  SELECT
    *,
    from_json(links_json, '[{"trace_id":"VARCHAR","span_id":"VARCHAR","attributes":"JSON"}]') AS link_list
  FROM otlp_traces
  WHERE trace_id = $traceId AND span_id = $spanId
), stored_traces AS (
  SELECT coalesce(list(DISTINCT otlp_traces.trace_id), []) AS trace_ids
  FROM otlp_traces
  WHERE otlp_traces.trace_id IN (SELECT unnest(link_list).trace_id FROM span)
)
SELECT
  scope_name,
  scope_version,
  attribute_entries(span_attributes) AS attributes,
  attribute_entries(resource_attributes) AS resource_attributes,
  list_transform(
    from_json(events_json, '[{"name":"VARCHAR","time_unix_nano":"BIGINT","attributes":"JSON"}]'),
    lambda event: {
      name: event.name,
      offset_ms: (nullif(event.time_unix_nano, 0) - epoch_ns(start_time_unix_nano)) / 1e6,
      attributes: attribute_entries(event.attributes)
    }
  ) AS events,
  list_transform(
    link_list,
    lambda link: {
      trace_id: link.trace_id,
      span_id: link.span_id,
      attributes: attribute_entries(link.attributes),
      has_trace: list_contains(stored_traces.trace_ids, link.trace_id)
    }
  ) AS links
FROM span, stored_traces
