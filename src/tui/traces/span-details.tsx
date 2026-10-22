import { formatDuration } from "../format.ts";
import { THEME } from "../theme.ts";

import type { AttributeValue, Span } from "./trace.ts";

const WIDTH = 48;
const SECTION_WIDTH = WIDTH - 3;
// Shared by every section so values line up and don't move between spans;
// longer keys are truncated.
const KEY_WIDTH = 22;

interface SpanDetailsProps {
  span: Span;
}

export function SpanDetails({ span }: SpanDetailsProps) {
  return (
    <scrollbox width={WIDTH} border={["left"]} borderColor={THEME.border} paddingLeft={1}>
      <text wrapMode="none" truncate>
        <b fg={THEME.text}>{span.name}</b>
      </text>
      <SpanStatusLine span={span} />
      <Section title="span" />
      <Fields
        entries={{
          kind: span.kind,
          duration: formatDuration(span.durationMs),
          start: `+${formatDuration(span.offsetMs)}`,
          "span id": span.spanId,
          "parent id": span.parentSpanId ?? "—",
        }}
      />
      <Section title="attributes" />
      <Fields entries={span.attributes} />
      <Section title="resource" />
      <Fields entries={span.resource} />
      <Section title={`events (${span.events.length})`} />
      {span.events.map((event, index) => (
        <box key={index}>
          <text fg={THEME.text}>
            <span fg={THEME.textMuted}>{`+${formatDuration(event.offsetMs)} `}</span>
            {event.name}
          </text>
          <box paddingLeft={2}>
            <Fields entries={event.attributes} />
          </box>
        </box>
      ))}
    </scrollbox>
  );
}

interface SpanStatusLineProps {
  span: Span;
}

function SpanStatusLine({ span }: SpanStatusLineProps) {
  const { status } = span;
  switch (status.code) {
    case "error":
      return (
        <text fg={THEME.error}>
          <b>✕ ERROR</b> {status.message}
        </text>
      );
    case "ok":
      return <text fg={THEME.success}>● OK</text>;
    case "unset":
      return <text fg={THEME.textMuted}>● UNSET</text>;
    default:
      status satisfies never;
      throw new Error(`Unknown span status: ${String(status)}`);
  }
}

interface SectionProps {
  title: string;
}

function Section({ title }: SectionProps) {
  return <text fg={THEME.textMuted}>{`─ ${title} `.padEnd(SECTION_WIDTH, "─")}</text>;
}

interface FieldsProps {
  entries: Record<string, AttributeValue>;
}

function Fields({ entries }: FieldsProps) {
  if (Object.keys(entries).length === 0) {
    return <text fg={THEME.textMuted}>none</text>;
  }
  return (
    <>
      {Object.entries(entries).map(([key, value]) => (
        <box key={key} flexDirection="row">
          <text width={KEY_WIDTH} flexShrink={0} fg={THEME.textMuted} wrapMode="none" truncate>
            {key}
          </text>
          <text flexGrow={1} marginLeft={1} fg={THEME.text}>
            {String(value)}
          </text>
        </box>
      ))}
    </>
  );
}
