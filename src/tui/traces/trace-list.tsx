import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { useDb } from "../db.ts";
import { Placeholder } from "../placeholder.tsx";
import { THEME } from "../theme.ts";
import TRACE_LIST_SQL from "./trace-list.sql" with { type: "text" };

const MAX_TRACES = 500;
const POLL_INTERVAL_MS = 1000;

const Trace = z.object({
  trace_id: z.string(),
  name: z.string(),
});

interface TraceListProps {
  focused: boolean;
}

export function TraceList({ focused }: TraceListProps) {
  const db = useDb();
  const { status, data: traces } = useQuery({
    queryKey: ["traces"],
    queryFn: async () => {
      const reader = await db.runAndReadAll(TRACE_LIST_SQL, { limit: MAX_TRACES });
      return Trace.array().parse(reader.getRowObjectsJS());
    },
    refetchInterval: POLL_INTERVAL_MS,
  });

  if (status === "error") {
    return <Placeholder text="Failed to load traces" fg={THEME.textError} />;
  }
  if (status === "pending" || traces.length === 0) {
    return <Placeholder text="Waiting for traces..." />;
  }
  return (
    <select
      flexGrow={1}
      focused={focused}
      options={traces.map((trace) => ({
        name: trace.name,
        description: "",
        value: trace.trace_id,
      }))}
      textColor={THEME.textMuted}
      focusedTextColor={THEME.textMuted}
      focusedBackgroundColor={THEME.background}
      selectedTextColor={THEME.text}
      selectedBackgroundColor={focused ? THEME.backgroundSelected : THEME.background}
      showDescription={false}
      showSelectionIndicator={false}
      showScrollIndicator={true}
    />
  );
}
