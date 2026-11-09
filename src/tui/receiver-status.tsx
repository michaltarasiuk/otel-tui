import { useQuery } from "@tanstack/react-query";

import { type ReceiverCounters, readReceiverCounters } from "#receiver/receiver-counters.ts";
import { formatCount } from "#utils/format-count.ts";
import { formatTimeAgo } from "#utils/format-time-ago.ts";

import { usePaused } from "./pause.tsx";
import { useConnection } from "./query/connection.ts";
import { POLL_INTERVAL_MS } from "./query/polling.ts";
import { THEME } from "./theme/theme.ts";

function useReceiverCounters(listenUrl: string) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["receiver-status", listenUrl],
    queryFn: () => readReceiverCounters(connection, listenUrl),
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
  httpUrl: string;
  grpcUrl: string;
  mcpUrl: string | undefined;
}

export function ReceiverStatus({ httpUrl, grpcUrl, mcpUrl }: ReceiverStatusProps) {
  const { data: counters } = useReceiverCounters(httpUrl);
  const paused = usePaused();

  return (
    <text fg={THEME.textMuted} wrapMode="none" truncate>
      {paused && <span fg={THEME.textWarning}>paused · </span>}
      {counters != null && `${formatReceived(counters)} · `}
      OTLP/HTTP {new URL(httpUrl).host} · OTLP/gRPC {new URL(grpcUrl).host}
      {mcpUrl !== undefined && ` · MCP ${new URL(mcpUrl).host}`}
    </text>
  );
}
