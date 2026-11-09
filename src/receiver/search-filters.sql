CREATE MACRO filter_value(key, fields, attributes, resource_attributes) AS coalesce(
  fields ->> key,
  attributes::JSON ->> key,
  resource_attributes::JSON ->> key
);

CREATE MACRO matches_filter(operator, expected, number, actual) AS CASE operator
  WHEN '=' THEN actual IS NOT DISTINCT FROM expected
  WHEN '!=' THEN actual IS NOT NULL AND actual <> expected
  WHEN '>' THEN TRY_CAST(actual AS DOUBLE) > number
  WHEN '>=' THEN TRY_CAST(actual AS DOUBLE) >= number
  WHEN '<' THEN TRY_CAST(actual AS DOUBLE) < number
  WHEN '<=' THEN TRY_CAST(actual AS DOUBLE) <= number
END IS TRUE;

CREATE MACRO matches_filters(filters, fields, attributes, resource_attributes) AS len(list_filter(
  from_json(filters, '[{"key":"VARCHAR","operator":"VARCHAR","value":"VARCHAR","number":"DOUBLE"}]'),
  lambda filter: NOT matches_filter(
    filter.operator,
    filter.value,
    filter.number,
    filter_value(filter.key, fields, attributes, resource_attributes)
  )
)) = 0
