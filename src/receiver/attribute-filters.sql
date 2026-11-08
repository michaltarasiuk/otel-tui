CREATE MACRO matches_attributes(filters, attributes, resource_attributes) AS len(list_filter(
  from_json(filters, '[{"key":"VARCHAR","value":"VARCHAR"}]'),
  lambda filter: coalesce(
    attributes::JSON ->> filter.key,
    resource_attributes::JSON ->> filter.key
  ) IS DISTINCT FROM filter.value
)) = 0
