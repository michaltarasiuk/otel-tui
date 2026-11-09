CREATE MACRO attribute_entries(attributes) AS list_transform(
  map_entries(attributes::JSON::MAP(VARCHAR, JSON)),
  lambda attribute: {key: attribute.key, value: json_extract_string(attribute.value, '$')}
)
