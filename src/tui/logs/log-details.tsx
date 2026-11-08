import type { ScrollBoxRenderable } from "@opentui/core";
import { TextAttributes } from "@opentui/core";

import { DetailsHeader, Id, Meta, Muted, ScopeName } from "#tui/components/details.tsx";
import { KeyValueList } from "#tui/components/key-value-list.tsx";
import { ScrollBox } from "#tui/components/scroll-box.tsx";
import { Section } from "#tui/components/section.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { THEME } from "#tui/theme/theme.ts";
import { formatJson } from "#utils/format-json.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";

import type { Log } from "./log.ts";
import { severityColor } from "./severity.ts";

interface SeverityLabelProps {
  severity: Log["severity"];
  children: string;
}

function SeverityLabel({ severity, children }: SeverityLabelProps) {
  return (
    <text fg={severityColor(severity)} attributes={TextAttributes.BOLD} flexShrink={0}>
      {children}
    </text>
  );
}

interface LogDetailsProps {
  ref: React.Ref<ScrollBoxRenderable>;
  log: Log;
}

export function LogDetails({ ref, log }: LogDetailsProps) {
  const severityLabel = log.severity ?? log.severity_text;

  return (
    <>
      <DetailsHeader>
        <Meta>
          {severityLabel !== null && (
            <SeverityLabel severity={log.severity}>{severityLabel}</SeverityLabel>
          )}
          {log.service_name !== null && (
            <Muted>
              <ServiceName name={log.service_name} />
            </Muted>
          )}
          {log.time !== null && <Muted>{formatTimeOfDay(log.time)}</Muted>}
          {log.event_name !== null && <Muted>{log.event_name}</Muted>}
        </Meta>
        {log.trace_id !== null && (
          <Id>
            {log.trace_id} {log.span_id}
          </Id>
        )}
      </DetailsHeader>
      <ScrollBox ref={ref}>
        {log.body !== null && (
          <Section title="Body">
            <text fg={THEME.text}>{formatJson(log.body)}</text>
          </Section>
        )}
        {log.attributes.length > 0 && (
          <Section title="Attributes">
            <KeyValueList entries={log.attributes} />
          </Section>
        )}
        {log.resource_attributes.length > 0 && (
          <Section title="Resource">
            <KeyValueList entries={log.resource_attributes} />
          </Section>
        )}
        {log.scope_name !== null && (
          <Section title="Scope">
            <ScopeName name={log.scope_name} version={log.scope_version} />
          </Section>
        )}
      </ScrollBox>
    </>
  );
}
