CREATE MACRO filter_value(key, fields, attributes, resource_attributes) AS coalesce(
  fields ->> key,
  attributes::JSON ->> key,
  resource_attributes::JSON ->> key
);

CREATE MACRO matches_filters(filters, fields, attributes, resource_attributes) AS len(list_filter(
  from_json(filters, '[{"key":"VARCHAR","value":"VARCHAR"}]'),
  lambda filter: filter_value(filter.key, fields, attributes, resource_attributes)
    IS DISTINCT FROM filter.value
)) = 0
