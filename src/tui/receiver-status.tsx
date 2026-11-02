import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import type { ReceiverUrls } from "../db/receiver.ts";
import { formatCount } from "../utils/format-count.ts";
import { formatTimeAgo } from "../utils/format-time-ago.ts";
import { useConnection } from "./connection.ts";
import { POLL_INTERVAL_MS } from "./polling.ts";
import receiverStatus from "./receiver-status.sql" with { type: "text" };
import { THEME } from "./theme.ts";

const ReceiverCounters = z.object({
  total_rows: z.number(),
  last_received_age_ms: z.number().nullable(),
});

function formatReceived({ total_rows, last_received_age_ms }: z.infer<typeof ReceiverCounters>) {
  if (total_rows === 0) {
    return "nothing received yet";
  }
  const received = `${formatCount(total_rows, "item")} received`;
  return last_received_age_ms === null
    ? received
    : `${received} ${formatTimeAgo(last_received_age_ms)}`;
}

interface ReceiverStatusProps {
  receiverUrls: ReceiverUrls;
}

export function ReceiverStatus({ receiverUrls }: ReceiverStatusProps) {
  const connection = useConnection();

  const { data: counters } = useQuery({
    queryKey: ["receiver-status", receiverUrls.http],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(receiverStatus, {
        listenUrl: receiverUrls.http,
      });
      const [counters] = ReceiverCounters.array().parse(reader.getRowObjectsJS());
      return counters ?? null;
    },
    refetchInterval: POLL_INTERVAL_MS,
  });

  return (
    <text fg={THEME.textMuted} wrapMode="none" truncate>
      {counters !== undefined && counters !== null && `${formatReceived(counters)} · `}
      OTLP/HTTP {new URL(receiverUrls.http).host} · OTLP/gRPC {new URL(receiverUrls.grpc).host}
    </text>
  );
}
