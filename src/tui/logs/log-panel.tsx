import { TextAttributes } from "@opentui/core";

import { EntryList } from "#tui/components/entry-list.tsx";
import { Panel, PanelBody } from "#tui/components/panel.tsx";
import { ScopeSection, Section } from "#tui/components/section.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { COLUMN_GAP } from "#tui/theme/columns.ts";
import { THEME } from "#tui/theme/theme.ts";
import { formatJson } from "#utils/format-json.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";

import type { Log } from "./log.ts";
import { severityColor } from "./severity.ts";

interface LogPanelProps {
  log: Log;
}

export function LogPanel({ log }: LogPanelProps) {
  const severityLabel = log.severity ?? log.severity_text;

  return (
    <Panel>
      <box flexDirection="row" gap={COLUMN_GAP}>
        <box flexGrow={1} flexBasis={0} flexDirection="row" gap={COLUMN_GAP} overflow="hidden">
          {severityLabel !== null && (
            <text fg={severityColor(log.severity)} attributes={TextAttributes.BOLD} flexShrink={0}>
              {severityLabel}
            </text>
          )}
          {log.service_name !== null && (
            <text fg={THEME.textMuted} wrapMode="none" flexShrink={0}>
              <ServiceName name={log.service_name} />
            </text>
          )}
          {log.time !== null && (
            <text fg={THEME.textMuted} flexShrink={0}>
              {formatTimeOfDay(log.time)}
            </text>
          )}
          {log.event_name !== null && (
            <text fg={THEME.textMuted} flexShrink={0}>
              {log.event_name}
            </text>
          )}
        </box>
        {log.trace_id !== null && (
          <text fg={THEME.textMuted} flexShrink={0}>
            {log.trace_id} {log.span_id}
          </text>
        )}
      </box>
      <PanelBody contentKey={log.log_id}>
        {log.body !== null && (
          <Section title="Body">
            <text fg={THEME.text}>{formatJson(log.body)}</text>
          </Section>
        )}
        {log.attributes.length > 0 && (
          <Section title="Attributes">
            <EntryList entries={log.attributes} />
          </Section>
        )}
        {log.resource_attributes.length > 0 && (
          <Section title="Resource">
            <EntryList entries={log.resource_attributes} />
          </Section>
        )}
        {log.scope_name !== null && (
          <ScopeSection name={log.scope_name} version={log.scope_version} />
        )}
      </PanelBody>
    </Panel>
  );
}
