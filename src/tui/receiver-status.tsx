import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import type { ReceiverUrls } from "#receiver/receiver.ts";
import { formatCount } from "#utils/format-count.ts";
import { formatTimeAgo } from "#utils/format-time-ago.ts";

import { usePaused } from "./pause.tsx";
import { useConnection } from "./query/connection.ts";
import { POLL_INTERVAL_MS } from "./query/polling.ts";
import receiverStatus from "./receiver-status.sql" with { type: "text" };
import { THEME } from "./theme/theme.ts";

const ReceiverCounters = z.object({
  total_rows: z.number(),
  last_received_age_ms: z.number().nullable(),
});
type ReceiverCounters = z.infer<typeof ReceiverCounters>;

function useReceiverCounters(listenUrl: string) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["receiver-status", listenUrl],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(receiverStatus, { listenUrl });
      const [counters = null] = ReceiverCounters.array().parse(reader.getRowObjectsJS());
      return counters;
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}

function formatReceived({ total_rows, last_received_age_ms }: ReceiverCounters) {
  if (total_rows === 0) {
    return "nothing received yet";
  }
  const received = `${formatCount(total_rows, "item")} received`;
  if (last_received_age_ms === null) {
    return received;
  }
  return `${received} ${formatTimeAgo(last_received_age_ms)}`;
}

interface ReceiverStatusProps {
  receiverUrls: ReceiverUrls;
  mcpUrl: string | undefined;
}

export function ReceiverStatus({ receiverUrls, mcpUrl }: ReceiverStatusProps) {
  const { data: counters } = useReceiverCounters(receiverUrls.http);
  const paused = usePaused();

  return (
    <text fg={THEME.textMuted} wrapMode="none" truncate>
      {paused && <span fg={THEME.textWarning}>paused · </span>}
      {counters != null && `${formatReceived(counters)} · `}
      OTLP/HTTP {new URL(receiverUrls.http).host} · OTLP/gRPC {new URL(receiverUrls.grpc).host}
      {mcpUrl !== undefined && ` · MCP ${new URL(mcpUrl).host}`}
    </text>
  );
}
