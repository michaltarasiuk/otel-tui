import { serviceColor } from "./theme.ts";

interface ServiceNameProps {
  name: string;
}

export function ServiceName({ name }: ServiceNameProps) {
  return (
    <>
      <span fg={serviceColor(name)}>●</span> {name}
    </>
  );
}
