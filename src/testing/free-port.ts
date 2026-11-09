export function freePort() {
  using listener = Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } });
  return listener.port;
}
