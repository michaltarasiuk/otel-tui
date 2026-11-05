import { EntryList } from "#tui/components/entry-list.tsx";
import { Facts, Heading } from "#tui/components/heading.tsx";
import { Panel, PanelBody } from "#tui/components/panel.tsx";
import { ScopeSection, Section } from "#tui/components/section.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { THEME } from "#tui/theme/theme.ts";
import { formatDuration } from "#utils/format-duration.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";

import type { Span, SpanDetails } from "./span.ts";
import { useSpanDetails } from "./trace-queries.ts";

const NESTED_INDENT = 2;

function formatOffset(ms: number) {
  return ms < 0 ? `-${formatDuration(-ms)}` : `+${formatDuration(ms)}`;
}

interface SpanBodyProps {
  details: SpanDetails;
}

function SpanBody({ details }: SpanBodyProps) {
  return (
    <>
      {details.events.length > 0 && (
        <Section title="Events">
          {details.events.map((event, index) => (
            <box key={index}>
              <text fg={THEME.text}>
                {event.offset_ms !== null && (
                  <span fg={THEME.textMuted}>{formatOffset(event.offset_ms)} </span>
                )}
                {event.name}
              </text>
              {event.attributes.length > 0 && (
                <box paddingLeft={NESTED_INDENT}>
                  <EntryList entries={event.attributes} />
                </box>
              )}
            </box>
          ))}
        </Section>
      )}
      {details.attributes.length > 0 && (
        <Section title="Attributes">
          <EntryList entries={details.attributes} />
        </Section>
      )}
      {details.links.length > 0 && (
        <Section title="Links">
          {details.links.map((link, index) => (
            <box key={index}>
              <text fg={THEME.text}>
                {link.trace_id} <span fg={THEME.textMuted}>{link.span_id}</span>
              </text>
              {link.attributes.length > 0 && (
                <box paddingLeft={NESTED_INDENT}>
                  <EntryList entries={link.attributes} />
                </box>
              )}
            </box>
          ))}
        </Section>
      )}
      {details.resource_attributes.length > 0 && (
        <Section title="Resource">
          <EntryList entries={details.resource_attributes} />
        </Section>
      )}
      {details.scope_name !== null && (
        <ScopeSection name={details.scope_name} version={details.scope_version} />
      )}
    </>
  );
}

interface SpanPanelProps {
  traceId: string;
  span: Span;
}

export function SpanPanel({ traceId, span }: SpanPanelProps) {
  const spanDetails = useSpanDetails(traceId, span.span_id);

  const detached = span.depth === 0 && span.parent_span_id !== null;

  return (
    <Panel>
      <Heading
        title={span.name}
        titleColor={span.is_error ? THEME.textError : THEME.text}
        aside={span.span_id}
      />
      <Facts>
        {span.service_name !== null && (
          <text fg={THEME.textMuted} wrapMode="none" flexShrink={0}>
            <ServiceName name={span.service_name} />
          </text>
        )}
        <text fg={THEME.textMuted} flexShrink={0}>
          {span.kind}
        </text>
        <text fg={THEME.textMuted} flexShrink={0}>
          {formatTimeOfDay(span.start_time)} +{formatDuration(span.offset_ms)}
        </text>
        <text fg={THEME.textMuted} flexShrink={0}>
          {formatDuration(span.duration_ms)}
        </text>
        {detached && (
          <text fg={THEME.textMuted} flexShrink={0}>
            parent {span.parent_span_id} not received
          </text>
        )}
      </Facts>
      {span.status_message !== null && (
        <text fg={span.is_error ? THEME.textError : THEME.textMuted}>{span.status_message}</text>
      )}
      <PanelBody contentKey={span.span_id}>
        {spanDetails.isError && <text fg={THEME.textError}>Failed to load span details</text>}
        {spanDetails.data === null && <text fg={THEME.textMuted}>Span is no longer stored</text>}
        {spanDetails.data !== undefined && spanDetails.data !== null && (
          <SpanBody details={spanDetails.data} />
        )}
      </PanelBody>
    </Panel>
  );
}
