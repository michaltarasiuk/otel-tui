import { KeyValueList } from "#tui/components/key-value-list.tsx";
import { Section } from "#tui/components/section.tsx";
import { Cell, Row, SelectedContext } from "#tui/components/table.tsx";

import type { SpanLink } from "./span.ts";

const NESTED_INDENT = 2;

function linkLabel(link: SpanLink, traceId: string) {
  const ids = `${link.trace_id} ${link.span_id}`;
  if (link.trace_id === traceId) {
    return `${ids} (this trace)`;
  }
  return link.has_trace ? ids : `${ids} (not stored)`;
}

interface LinkListProps {
  links: SpanLink[];
  traceId: string;
  selectedIndex: number;
}

export function LinkList({ links, traceId, selectedIndex }: LinkListProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <Section title="Links">
      {links.map((link, index) => (
        <box key={`${link.trace_id}:${link.span_id}`}>
          <SelectedContext value={index === selectedIndex}>
            <Row>
              <Cell grow={1} muted={!link.has_trace}>
                {linkLabel(link, traceId)}
              </Cell>
            </Row>
          </SelectedContext>
          {link.attributes.length > 0 && (
            <box paddingLeft={NESTED_INDENT}>
              <KeyValueList entries={link.attributes} />
            </box>
          )}
        </box>
      ))}
    </Section>
  );
}
