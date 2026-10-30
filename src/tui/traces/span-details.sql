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
    from_json(links_json, '[{"trace_id":"VARCHAR","span_id":"VARCHAR","attributes":"JSON"}]'),
    lambda link: {
      trace_id: link.trace_id,
      span_id: link.span_id,
      attributes: attribute_entries(link.attributes)
    }
  ) AS links
FROM otlp_traces
WHERE trace_id = $traceId AND span_id = $spanId
