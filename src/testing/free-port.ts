import { LOOPBACK_HOST } from "#utils/loopback.ts";

function listen() {
  return Bun.listen({ hostname: LOOPBACK_HOST, port: 0, socket: { data() {} } });
}

export function freePort() {
  using listener = listen();
  return listener.port;
}

export function freePortPair() {
  using first = listen();
  using second = listen();
  return [first.port, second.port] as const;
}
