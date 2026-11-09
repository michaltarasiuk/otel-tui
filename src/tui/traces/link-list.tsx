import { MouseButton } from "@opentui/core";

import type { SpanLink } from "#telemetry/traces/span.ts";
import { useFocusRequest } from "#tui/components/focus.tsx";
import { KeyValueList } from "#tui/components/key-value-list.tsx";
import { Section } from "#tui/components/section.tsx";
import { Cell, Row, SelectedContext } from "#tui/components/table.tsx";

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
  onSelect: (index: number) => void;
}

export function LinkList({ links, traceId, selectedIndex, onSelect }: LinkListProps) {
  const requestFocus = useFocusRequest();

  if (links.length === 0) {
    return null;
  }

  return (
    <Section title="Links">
      {links.map((link, index) => (
        <box
          key={`${link.trace_id}:${link.span_id}`}
          onMouseDown={(event) => {
            if (event.button === MouseButton.LEFT) {
              requestFocus();
              onSelect(index);
            }
          }}
        >
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
