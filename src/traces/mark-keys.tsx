import { Key } from "#ui/key-hints.tsx";

import { type MarkedTrace, sameRoot } from "./trace.ts";

interface MarkKeysProps {
  trace: MarkedTrace;
  marked: MarkedTrace | undefined;
  onMark: (marked: MarkedTrace | undefined) => void;
  onCompare: (before: string, after: string) => void;
}

export function MarkKeys({ trace, marked, onMark, onCompare }: MarkKeysProps) {
  const unmark = marked?.traceId === trace.traceId;

  return (
    <>
      <Key
        name="m"
        description={unmark ? "unmark the trace to compare with" : "mark the trace to compare with"}
        onPress={() => onMark(unmark ? undefined : trace)}
      >
        {unmark ? "unmark" : "mark"}
      </Key>
      {marked !== undefined && !unmark && sameRoot(marked.root, trace.root) && (
        <Key
          name="v"
          description="compare with the marked trace, which has the same root span"
          onPress={() => onCompare(marked.traceId, trace.traceId)}
        >
          compare
        </Key>
      )}
    </>
  );
}
