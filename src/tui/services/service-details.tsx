import type { Service } from "#telemetry/services/service.ts";
import { DetailsHeader, Id, Title } from "#tui/components/details.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";

interface ServiceDetailsProps {
  service: Service;
  children: React.ReactNode;
}

export function ServiceDetails({ service, children }: ServiceDetailsProps) {
  return (
    <>
      <DetailsHeader>
        <Title>
          <ServiceName name={service.service_name} />
        </Title>
        <Id>server and consumer spans</Id>
      </DetailsHeader>
      {children}
    </>
  );
}
