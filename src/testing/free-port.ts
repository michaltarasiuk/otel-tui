import { LOOPBACK_HOST } from "#utils/loopback.ts";

export function freePort() {
  using listener = Bun.listen({ hostname: LOOPBACK_HOST, port: 0, socket: { data() {} } });
  return listener.port;
}
