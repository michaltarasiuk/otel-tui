SELECT
  scope_name,
  scope_version,
  list_transform(
    map_entries(span_attributes::JSON::MAP(VARCHAR, JSON)),
    lambda attribute: {key: attribute.key, value: json_extract_string(attribute.value, '$')}
  ) AS attributes,
  list_transform(
    map_entries(resource_attributes::JSON::MAP(VARCHAR, JSON)),
    lambda attribute: {key: attribute.key, value: json_extract_string(attribute.value, '$')}
  ) AS resource_attributes,
  list_transform(
    from_json(events_json, '[{"name":"VARCHAR","time_unix_nano":"BIGINT","attributes":"MAP(VARCHAR, JSON)"}]'),
    lambda event: {
      name: event.name,
      offset_ms: (event.time_unix_nano - epoch_ns(start_time_unix_nano)) / 1e6,
      attributes: list_transform(
        map_entries(event.attributes),
        lambda attribute: {key: attribute.key, value: json_extract_string(attribute.value, '$')}
      )
    }
  ) AS events,
  list_transform(
    from_json(links_json, '[{"trace_id":"VARCHAR","span_id":"VARCHAR","attributes":"MAP(VARCHAR, JSON)"}]'),
    lambda link: {
      trace_id: link.trace_id,
      span_id: link.span_id,
      attributes: list_transform(
        map_entries(link.attributes),
        lambda attribute: {key: attribute.key, value: json_extract_string(attribute.value, '$')}
      )
    }
  ) AS links
FROM otlp_traces
WHERE trace_id = $traceId AND span_id = $spanId
