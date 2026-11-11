import { DetailsHeader, Id, Title } from "#ui/details.tsx";
import { ServiceName } from "#ui/service-name.tsx";

import type { Service } from "./service.ts";

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
