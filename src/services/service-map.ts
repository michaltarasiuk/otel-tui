import { compareText } from "#utils/text.ts";

import type { Call } from "./service.ts";

export interface MapNode {
  id: string;
  depth: number;
  name: string;
  call: Call | undefined;
  isCycle: boolean;
}

export function serviceMap(calls: Call[]) {
  const callsByCaller = Map.groupBy(calls, (call) => call.caller);
  const callees = new Set(calls.filter((call) => !call.is_external).map((call) => call.callee));
  const callers = [...callsByCaller.keys()].sort((a, b) => compareText(a, b));
  const expanded = new Set<string>();
  const nodes: MapNode[] = [];

  function visitCalls(caller: string, parentId: string, path: string[]) {
    expanded.add(caller);
    for (const call of callsByCaller.get(caller) ?? []) {
      const id = `${parentId}/${call.call_id}`;
      const depth = path.length;
      const isCycle = !call.is_external && path.includes(call.callee);
      nodes.push({ id, depth, name: call.callee, call, isCycle });
      if (!call.is_external && !isCycle) {
        visitCalls(call.callee, id, [...path, call.callee]);
      }
    }
  }

  function visitRoot(service: string) {
    nodes.push({ id: service, depth: 0, name: service, call: undefined, isCycle: false });
    visitCalls(service, service, [service]);
  }

  for (const caller of callers.filter((caller) => !callees.has(caller))) {
    visitRoot(caller);
  }
  for (const caller of callers) {
    if (!expanded.has(caller)) {
      visitRoot(caller);
    }
  }
  return nodes;
}
