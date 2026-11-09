import type { ScrollBoxRenderable } from "@opentui/core";

import type { Span, SpanContent } from "#telemetry/traces/span.ts";
import {
  Description,
  DetailsHeader,
  Id,
  Meta,
  Fact,
  ScopeName,
  Title,
} from "#tui/components/details.tsx";
import { KeyValueList } from "#tui/components/key-value-list.tsx";
import { ScrollBox } from "#tui/components/scroll-box.tsx";
import { Section } from "#tui/components/section.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { THEME } from "#tui/theme/theme.ts";
import { formatDuration } from "#utils/format-duration.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";

const NESTED_INDENT = 2;

function formatOffset(ms: number) {
  return ms < 0 ? `-${formatDuration(-ms)}` : `+${formatDuration(ms)}`;
}

interface SpanSectionsProps {
  content: SpanContent;
  children: React.ReactNode;
}

function SpanSections({ content, children }: SpanSectionsProps) {
  return (
    <>
      {content.events.length > 0 && (
        <Section title="Events">
          {content.events.map((event, index) => (
            <box key={index}>
              <text fg={THEME.text}>
                {event.offset_ms !== null && (
                  <span fg={THEME.textMuted}>{formatOffset(event.offset_ms)} </span>
                )}
                {event.name}
              </text>
              {event.attributes.length > 0 && (
                <box paddingLeft={NESTED_INDENT}>
                  <KeyValueList entries={event.attributes} />
                </box>
              )}
            </box>
          ))}
        </Section>
      )}
      {content.attributes.length > 0 && (
        <Section title="Attributes">
          <KeyValueList entries={content.attributes} />
        </Section>
      )}
      {children}
      {content.resource_attributes.length > 0 && (
        <Section title="Resource">
          <KeyValueList entries={content.resource_attributes} />
        </Section>
      )}
      {content.scope_name !== null && (
        <Section title="Scope">
          <ScopeName name={content.scope_name} version={content.scope_version} />
        </Section>
      )}
    </>
  );
}

interface SpanDetailsProps {
  ref: React.Ref<ScrollBoxRenderable>;
  span: Span;
  content: SpanContent | null | undefined;
  failed: boolean;
  children: React.ReactNode;
}

export function SpanDetails({ ref, span, content, failed, children }: SpanDetailsProps) {
  const detached = span.depth === 0 && span.parent_span_id !== null;

  return (
    <>
      <DetailsHeader>
        <Title color={span.is_error ? THEME.textError : THEME.text}>{span.name}</Title>
        <Id>{span.span_id}</Id>
      </DetailsHeader>
      <Meta>
        {span.service_name !== null && (
          <Fact>
            <ServiceName name={span.service_name} />
          </Fact>
        )}
        <Fact>{span.kind}</Fact>
        <Fact>
          {formatTimeOfDay(span.start_time)} +{formatDuration(span.offset_ms)}
        </Fact>
        <Fact>{formatDuration(span.duration_ms)}</Fact>
        {detached && <Fact>parent {span.parent_span_id} not received</Fact>}
      </Meta>
      {span.status_message !== null && (
        <Description color={span.is_error ? THEME.textError : THEME.textMuted}>
          {span.status_message}
        </Description>
      )}
      <ScrollBox ref={ref}>
        {failed && <Description color={THEME.textError}>Failed to load span details</Description>}
        {content === null && <Description>Span is no longer stored</Description>}
        {content !== null && content !== undefined && (
          <SpanSections content={content}>{children}</SpanSections>
        )}
      </ScrollBox>
    </>
  );
}
