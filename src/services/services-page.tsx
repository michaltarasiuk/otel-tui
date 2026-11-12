import { useDeferredValue, useState } from "react";

import { Description } from "#ui/details.tsx";
import { ErrorBoundary } from "#ui/error-boundary.tsx";
import { FocusScope } from "#ui/focus.tsx";
import { Key, KeyHints, StepKeys } from "#ui/key-hints.tsx";
import { Chip, Count, PageHeader, SearchInput } from "#ui/page-header.tsx";
import { PauseKey } from "#ui/pause.tsx";
import { Placeholder } from "#ui/placeholder.tsx";
import { SearchKeys } from "#ui/search-keys.tsx";
import { Split } from "#ui/split.tsx";
import { THEME } from "#ui/theme.ts";
import { useRegion } from "#ui/use-region.ts";
import { useSearch } from "#ui/use-search.ts";
import { useSelection } from "#ui/use-selection.ts";
import { cycle } from "#utils/cycle.ts";
import { formatCount } from "#utils/number.ts";

import { OperationTable } from "./operation-table.tsx";
import { SERVICE_WINDOW_MS } from "./read-services.ts";
import { ServiceDetails } from "./service-details.tsx";
import { useServiceOperations, useServices } from "./service-queries.ts";
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
  const deferredSort = useDeferredValue(sort);

  const serviceList = useServices({ search: search.deferredText, sort: deferredSort });
  const { data: services } = serviceList;

  const [selectedIndex, select] = useSelection(services, (service) => service.service_name);
  const selected = services[selectedIndex];
  const deferredSelected = useDeferredValue(selected);

  const { data: operations = [] } = useServiceOperations(deferredSelected?.service_name);
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
      ) : selected === undefined || deferredSelected === undefined ? (
        <Placeholder
          text={
            search.deferredText !== ""
              ? "No services match"
              : "Waiting for server or consumer spans..."
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
                sort={deferredSort}
              />
            </FocusScope>
            <ServiceDetails key={deferredSelected.service_name} service={deferredSelected}>
              <FocusScope
                focused={region === "operations"}
                onFocusRequest={() => focusRegion("operations")}
              >
                <ErrorBoundary
                  fallback={
                    <Description color={THEME.textError}>Failed to load operations</Description>
                  }
                >
                  <OperationTable
                    serviceName={deferredSelected.service_name}
                    selectedIndex={operationIndex}
                    onSelect={(action) => selectOperation(action)}
                  />
                </ErrorBoundary>
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
                column: cycle(SERVICE_SORT_COLUMNS, sort.column, 1),
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
