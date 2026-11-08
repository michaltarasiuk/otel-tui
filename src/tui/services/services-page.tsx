import type { ScrollBoxRenderable } from "@opentui/core";
import { useRef, useState } from "react";

import { FocusScope } from "#tui/components/focus.tsx";
import { Key, KeyHints } from "#tui/components/key-hints.tsx";
import { Chip, Count, PageHeader, SearchInput } from "#tui/components/page-header.tsx";
import { Placeholder } from "#tui/components/placeholder.tsx";
import { ScrollKeys } from "#tui/components/scroll-box.tsx";
import { SearchKeys } from "#tui/components/search-keys.tsx";
import { Split } from "#tui/components/split.tsx";
import { useSearch } from "#tui/components/use-search.ts";
import { useSelection } from "#tui/components/use-selection.ts";
import { PauseKey } from "#tui/pause.tsx";
import { formatCount } from "#utils/format-count.ts";
import { stepItem } from "#utils/step-item.ts";

import { ServiceDetails } from "./service-details.tsx";
import { SERVICE_WINDOW_MS, useServiceList, useServiceOperations } from "./service-queries.ts";
import { ServiceTable } from "./service-table.tsx";
import { SERVICE_SORT_COLUMNS, type ServiceSort } from "./service.ts";

const BUSIEST_FIRST: ServiceSort = { column: "rate", descending: true };

const WINDOW_LABEL = `last ${SERVICE_WINDOW_MS / 60_000} min`;

interface ServicesPageProps {
  onOpenTraces: (serviceName: string) => void;
}

export function ServicesPage({ onOpenTraces }: ServicesPageProps) {
  const search = useSearch();
  const [sort, setSort] = useState(BUSIEST_FIRST);
  const detailsRef = useRef<ScrollBoxRenderable>(null);

  const serviceList = useServiceList({ search: search.text, sort });
  const { data: services = [] } = serviceList;

  const [selectedIndex, select] = useSelection(services, (service) => service.service_name);
  const selected = services[selectedIndex];

  const serviceOperations = useServiceOperations(selected?.service_name);

  const browsing = !search.isEditing;

  return (
    <box flexGrow={1}>
      <PageHeader>
        <SearchInput search={search} placeholder="service name" />
        <Chip>{WINDOW_LABEL}</Chip>
        <Count>{formatCount(services.length, "service")}</Count>
      </PageHeader>
      {serviceList.isError ? (
        <Placeholder text="Failed to load services" variant="error" />
      ) : serviceList.isPending || selected === undefined ? (
        <Placeholder
          text={
            search.text !== "" ? "No services match" : "Waiting for server or consumer spans..."
          }
        />
      ) : (
        <FocusScope focused={browsing}>
          <Split>
            <ServiceTable
              services={services}
              selectedIndex={selectedIndex}
              onSelect={(action) => select(action)}
              sort={sort}
            />
            <ServiceDetails
              key={selected.service_name}
              ref={detailsRef}
              service={selected}
              operations={serviceOperations.data ?? []}
              failed={serviceOperations.isError}
            />
          </Split>
        </FocusScope>
      )}
      <KeyHints>
        <FocusScope focused={browsing}>
          {selected !== undefined && (
            <Key name="return" onPress={() => onOpenTraces(selected.service_name)}>
              traces
            </Key>
          )}
        </FocusScope>
        <SearchKeys search={search} />
        <FocusScope focused={browsing}>
          <Key
            name="o"
            onPress={() =>
              setSort((sort) => ({
                column: stepItem(SERVICE_SORT_COLUMNS, sort.column, 1),
                descending: true,
              }))
            }
          >
            sort
          </Key>
          <Key
            name="shift+o"
            onPress={() => setSort((sort) => ({ ...sort, descending: !sort.descending }))}
          >
            reverse
          </Key>
          {selected !== undefined && <ScrollKeys target={detailsRef} />}
          <PauseKey />
        </FocusScope>
      </KeyHints>
    </box>
  );
}
