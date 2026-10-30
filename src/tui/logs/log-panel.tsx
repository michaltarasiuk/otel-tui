import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core";
import { useBindings } from "@opentui/keymap/react";
import { useRef } from "react";

import { formatTime } from "../../utils/format-time.ts";
import { COLUMN_GAP } from "../columns.ts";
import { EntryList } from "../entry-list.tsx";
import { IGNORE_CONTENT_SIZE } from "../flex.ts";
import { useFocused } from "../focus.tsx";
import { ScopeSection, Section } from "../section.tsx";
import { ServiceName } from "../service-name.tsx";
import { THEME } from "../theme.ts";
import type { Log } from "./log.ts";
import { severityColor } from "./severity.ts";

const HALF_VIEWPORT = 0.5;
const SCROLLBAR_WIDTH = 1;
const JSON_INDENT = 2;

function formatBody(body: string) {
  try {
    const value: unknown = JSON.parse(body);
    return typeof value === "object" && value !== null
      ? JSON.stringify(value, null, JSON_INDENT)
      : body;
  } catch {
    return body;
  }
}

interface LogPanelProps {
  log: Log;
}

export function LogPanel({ log }: LogPanelProps) {
  const focused = useFocused();

  const bodyRef = useRef<ScrollBoxRenderable>(null);

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        {
          name: "log.scroll-down",
          desc: "scroll",
          run() {
            bodyRef.current?.scrollBy(HALF_VIEWPORT, "viewport");
          },
        },
        {
          name: "log.scroll-up",
          run() {
            bodyRef.current?.scrollBy(-HALF_VIEWPORT, "viewport");
          },
        },
      ],
      bindings: [
        { key: "ctrl+d", cmd: "log.scroll-down" },
        { key: "ctrl+u", cmd: "log.scroll-up" },
      ],
    }),
    [focused],
  );

  const severityLabel = log.severity ?? log.severity_text;

  return (
    <box
      flexGrow={1}
      flexBasis={IGNORE_CONTENT_SIZE}
      border={["top"]}
      borderColor={THEME.textMuted}
      paddingX={1}
    >
      <box flexDirection="row" gap={COLUMN_GAP}>
        <box
          flexGrow={1}
          flexBasis={IGNORE_CONTENT_SIZE}
          flexDirection="row"
          gap={COLUMN_GAP}
          overflow="hidden"
        >
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
              {formatTime(log.time)}
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
      <scrollbox
        key={log.log_id}
        ref={bodyRef}
        flexGrow={1}
        flexBasis={IGNORE_CONTENT_SIZE}
        scrollbarOptions={{ showArrows: false }}
        contentOptions={{ paddingRight: SCROLLBAR_WIDTH }}
      >
        {log.body !== null && (
          <Section title="Body">
            <text fg={THEME.text}>{formatBody(log.body)}</text>
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
      </scrollbox>
    </box>
  );
}
