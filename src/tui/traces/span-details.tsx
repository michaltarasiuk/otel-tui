import type { ScrollBoxRenderable } from "@opentui/core";
import { Suspense } from "react";

import {
  Description,
  DetailsHeader,
  Id,
  Meta,
  Fact,
  ScopeName,
  Title,
} from "#tui/components/details.tsx";
import { ErrorBoundary } from "#tui/components/error-boundary.tsx";
import { KeyValueList } from "#tui/components/key-value-list.tsx";
import { ScrollBox } from "#tui/components/scroll-box.tsx";
import { Section } from "#tui/components/section.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { THEME } from "#tui/theme/theme.ts";
import { formatDuration } from "#utils/format-duration.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";

import type { Span } from "./span.ts";
import { useSpanContent } from "./trace-queries.ts";

const NESTED_INDENT = 2;

function formatOffset(ms: number) {
  return ms < 0 ? `-${formatDuration(-ms)}` : `+${formatDuration(ms)}`;
}

interface SpanSectionsProps {
  traceId: string;
  spanId: string;
}

function SpanSections({ traceId, spanId }: SpanSectionsProps) {
  const { data: content } = useSpanContent(traceId, spanId);

  if (content === null) {
    return <Description>Span is no longer stored</Description>;
  }

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
      {content.links.length > 0 && (
        <Section title="Links">
          {content.links.map((link, index) => (
            <box key={index}>
              <text fg={THEME.text}>
                {link.trace_id} <span fg={THEME.textMuted}>{link.span_id}</span>
              </text>
              {link.attributes.length > 0 && (
                <box paddingLeft={NESTED_INDENT}>
                  <KeyValueList entries={link.attributes} />
                </box>
              )}
            </box>
          ))}
        </Section>
      )}
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
  traceId: string;
  span: Span;
}

export function SpanDetails({ ref, traceId, span }: SpanDetailsProps) {
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
        <ErrorBoundary
          fallback={<Description color={THEME.textError}>Failed to load span details</Description>}
        >
          <Suspense>
            <SpanSections traceId={traceId} spanId={span.span_id} />
          </Suspense>
        </ErrorBoundary>
      </ScrollBox>
    </>
  );
}
