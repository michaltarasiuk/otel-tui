import type { DuckDBConnection } from "@duckdb/node-api";
import { queryOptions, useQuery } from "@tanstack/react-query";

import { useConnection } from "#query/connection.ts";
import { POLL_INTERVAL_MS } from "#query/polling.ts";
import { type ReceiverCounters, readReceiverCounters } from "#receiver/receiver-counters.ts";
import { usePaused } from "#ui/pause.tsx";
import { THEME } from "#ui/theme.ts";
import { formatCount } from "#utils/number.ts";
import { formatAgo } from "#utils/time.ts";

function receiverCountersQuery(connection: DuckDBConnection, listenUrl: string) {
  return queryOptions({
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
  return `${received} ${formatAgo(last_received_age_ms)}`;
}

interface ReceiverStatusProps {
  httpUrl: string;
  grpcUrl: string;
  mcpUrl: string | undefined;
}

export function ReceiverStatus({ httpUrl, grpcUrl, mcpUrl }: ReceiverStatusProps) {
  const connection = useConnection();
  const { data: counters } = useQuery(receiverCountersQuery(connection, httpUrl));
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
