SELECT
  total_rows::DOUBLE AS total_rows,
  last_seal_age_ms::DOUBLE AS last_received_age_ms
FROM otlp_server_list()
WHERE listen_url = $listenUrl
