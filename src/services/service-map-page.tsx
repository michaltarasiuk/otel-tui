import { useSuspenseQuery } from "@tanstack/react-query";

import { useConnection } from "#query/connection.ts";
import { Key, KeyHints } from "#ui/key-hints.tsx";
import { Chip, Count, PageHeader } from "#ui/page-header.tsx";
import { PauseKey } from "#ui/pause.tsx";
import { Placeholder } from "#ui/placeholder.tsx";
import { useSelection } from "#ui/use-selection.ts";
import { formatCount } from "#utils/number.ts";

import { SERVICE_WINDOW_LABEL } from "./read-services.ts";
import { ServiceMapTable } from "./service-map-table.tsx";
import { serviceMap } from "./service-map.ts";
import { serviceCallsQuery } from "./service-queries.ts";

interface ServiceMapPageProps {
  onOpenTraces: (service: string) => void;
  onBack: () => void;
}

export function ServiceMapPage({ onOpenTraces, onBack }: ServiceMapPageProps) {
  const connection = useConnection();
  const { data: calls, isError } = useSuspenseQuery(serviceCallsQuery(connection));
  const nodes = serviceMap(calls);

  const selection = useSelection(nodes, (node) => node.id);
  const { selected } = selection;

  return (
    <box flexGrow={1}>
      <PageHeader>
        <box flexGrow={1} />
        <Chip>{SERVICE_WINDOW_LABEL}</Chip>
        <Count>{formatCount(calls.length, "dependency", "dependencies")}</Count>
      </PageHeader>
      {isError ? (
        <Placeholder text="Failed to load the service map" variant="error" />
      ) : nodes.length === 0 ? (
        <Placeholder text="Waiting for spans that call another service..." />
      ) : (
        <ServiceMapTable nodes={nodes} selection={selection} />
      )}
      <KeyHints>
        <Key name="escape" onPress={() => onBack()}>
          back
        </Key>
        {selected !== undefined && selected.call?.is_external !== true && (
          <Key name="return" onPress={() => onOpenTraces(selected.name)}>
            traces
          </Key>
        )}
        <PauseKey />
      </KeyHints>
    </box>
  );
}
