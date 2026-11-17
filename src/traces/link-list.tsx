import { KeyValueList } from "#ui/key-value-list.tsx";
import { Selectable } from "#ui/rows.tsx";
import { Section } from "#ui/section.tsx";
import { Cell, Row } from "#ui/table.tsx";
import type { Selection } from "#ui/use-selection.ts";

import type { Span, SpanLink } from "./span.ts";

const NESTED_INDENT = 2;

function linkLabel(link: SpanLink, traceId: string) {
  const ids = `${link.trace_id} ${link.span_id}`;
  if (link.trace_id === traceId) {
    return `${ids} (this trace)`;
  }
  return link.has_trace ? ids : `${ids} (not stored)`;
}

export function canOpenLink(link: SpanLink, traceId: string, spans: Span[]) {
  if (link.trace_id === traceId) {
    return spans.some((span) => span.span_id === link.span_id);
  }
  return link.has_trace;
}

interface LinkListProps {
  links: SpanLink[];
  traceId: string;
  selection: Selection<SpanLink>;
}

export function LinkList({ links, traceId, selection }: LinkListProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <Section title="Links">
      {links.map((link, index) => (
        <Selectable key={link.span_id} selection={selection} index={index}>
          <Row>
            <Cell grow={1} muted={!link.has_trace}>
              {linkLabel(link, traceId)}
            </Cell>
          </Row>
          {link.attributes.length > 0 && (
            <box paddingLeft={NESTED_INDENT}>
              <KeyValueList entries={link.attributes} />
            </box>
          )}
        </Selectable>
      ))}
    </Section>
  );
}
