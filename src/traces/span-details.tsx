import type { ScrollBoxRenderable } from "@opentui/core";

import { Description, DetailsHeader, Id, Meta, Fact, ScopeName, Title } from "#ui/details.tsx";
import { ErrorBoundary } from "#ui/error-boundary.tsx";
import { KeyValueList } from "#ui/key-value-list.tsx";
import { ScrollBox } from "#ui/scroll-box.tsx";
import { Section } from "#ui/section.tsx";
import { ServiceName } from "#ui/service-name.tsx";
import { THEME } from "#ui/theme.ts";
import { formatDuration, formatOffset, formatTime } from "#utils/time.ts";

import type { Span } from "./span.ts";
import { useSuspenseSpanContent } from "./trace-queries.ts";

const NESTED_INDENT = 2;

interface SpanSectionsProps {
  traceId: string;
  spanId: string;
  children: React.ReactNode;
}

function SpanSections({ traceId, spanId, children }: SpanSectionsProps) {
  const { data: content } = useSuspenseSpanContent(traceId, spanId);

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
  traceId: string;
  span: Span;
  children: React.ReactNode;
}

export function SpanDetails({ ref, traceId, span, children }: SpanDetailsProps) {
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
          {formatTime(span.start_time)} {formatOffset(span.offset_ms)}
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
          <SpanSections traceId={traceId} spanId={span.span_id}>
            {children}
          </SpanSections>
        </ErrorBoundary>
      </ScrollBox>
    </>
  );
}
