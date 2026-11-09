import { useState } from "react";

import { FocusScope } from "#tui/components/focus.tsx";
import { Key, KeyHints, StepKeys } from "#tui/components/key-hints.tsx";
import { Chip, Count, PageHeader, SearchInput } from "#tui/components/page-header.tsx";
import { Placeholder } from "#tui/components/placeholder.tsx";
import { SearchKeys } from "#tui/components/search-keys.tsx";
import { Split } from "#tui/components/split.tsx";
import { useRegion } from "#tui/components/use-region.ts";
import { useSearch } from "#tui/components/use-search.ts";
import { useSelection } from "#tui/components/use-selection.ts";
import { PauseKey } from "#tui/pause.tsx";
import { formatCount } from "#utils/format-count.ts";
import { stepItem } from "#utils/step-item.ts";

import { OperationTable } from "./operation-table.tsx";
import { ServiceDetails } from "./service-details.tsx";
import { SERVICE_WINDOW_MS, useServiceList, useServiceOperations } from "./service-queries.ts";
import { ServiceTable } from "./service-table.tsx";
import { SERVICE_SORT_COLUMNS, type ServiceSort } from "./service.ts";

const REGION_KEYS_PRIORITY = 1;

const SERVICES_ONLY = ["services"] as const;
const SERVICES_AND_OPERATIONS = ["services", "operations"] as const;

const BUSIEST_FIRST: ServiceSort = { column: "rate", descending: true };

const WINDOW_LABEL = `last ${SERVICE_WINDOW_MS / 60_000} min`;

interface ServicesPageProps {
  onOpenTraces: (service: string, operation?: string) => void;
}

export function ServicesPage({ onOpenTraces }: ServicesPageProps) {
  const search = useSearch();
  const [sort, setSort] = useState(BUSIEST_FIRST);

  const serviceList = useServiceList({ search: search.text, sort });
  const { data: services = [] } = serviceList;

  const [selectedIndex, select] = useSelection(services, (service) => service.service_name);
  const selected = services[selectedIndex];

  const serviceOperations = useServiceOperations(selected?.service_name);
  const { data: operations = [] } = serviceOperations;
  const [operationIndex, selectOperation] = useSelection(operations, (operation) => operation.name);
  const operation = operations[operationIndex];

  const [region, stepRegion, focusRegion] = useRegion(
    operations.length > 0 ? SERVICES_AND_OPERATIONS : SERVICES_ONLY,
  );

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
            <FocusScope
              focused={region === "services"}
              onFocusRequest={() => focusRegion("services")}
            >
              <ServiceTable
                services={services}
                selectedIndex={selectedIndex}
                onSelect={(action) => select(action)}
                sort={sort}
              />
            </FocusScope>
            <ServiceDetails service={selected}>
              <FocusScope
                focused={region === "operations"}
                onFocusRequest={() => focusRegion("operations")}
              >
                <OperationTable
                  operations={operations}
                  failed={serviceOperations.isError}
                  selectedIndex={operationIndex}
                  onSelect={(action) => selectOperation(action)}
                />
              </FocusScope>
            </ServiceDetails>
          </Split>
        </FocusScope>
      )}
      <KeyHints>
        <FocusScope focused={browsing && region === "services"}>
          {selected !== undefined && (
            <Key name="return" onPress={() => onOpenTraces(selected.service_name)}>
              traces
            </Key>
          )}
        </FocusScope>
        <FocusScope focused={browsing && region === "operations"}>
          {selected !== undefined && operation !== undefined && (
            <Key name="return" onPress={() => onOpenTraces(selected.service_name, operation.name)}>
              traces
            </Key>
          )}
        </FocusScope>
        <SearchKeys search={search} />
        <FocusScope focused={browsing && region === "services"}>
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
        </FocusScope>
        <FocusScope focused={browsing}>
          <PauseKey />
          <StepKeys
            forward="tab"
            description="next region"
            backwardDescription="previous region"
            backward="shift+tab"
            priority={REGION_KEYS_PRIORITY}
            onStep={(step) => stepRegion(step)}
          />
        </FocusScope>
      </KeyHints>
    </box>
  );
}
