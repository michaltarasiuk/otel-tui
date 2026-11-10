import type { ScrollBoxRenderable } from "@opentui/core";
import { useDeferredValue, useRef, useState } from "react";

import {
  ancestorIds,
  criticalPath,
  descendantCount,
  visibleSpans,
} from "#telemetry/traces/span-tree.ts";
import type { Span, SpanLink } from "#telemetry/traces/span.ts";
import { CopyKey } from "#tui/clipboard.tsx";
import { FocusScope } from "#tui/components/focus.tsx";
import { Key, KeyHints, StepKeys } from "#tui/components/key-hints.tsx";
import { Placeholder } from "#tui/components/placeholder.tsx";
import { ScrollKeys } from "#tui/components/scroll-box.tsx";
import { Split } from "#tui/components/split.tsx";
import { useRegion } from "#tui/components/use-region.ts";
import { useSelection } from "#tui/components/use-selection.ts";
import { PauseKey } from "#tui/pause.tsx";
import { findNextIndex } from "#utils/cycle.ts";

import { LinkList } from "./link-list.tsx";
import { SpanDetails } from "./span-details.tsx";
import { SpanWaterfall } from "./span-waterfall.tsx";
import { TraceHeader } from "./trace-header.tsx";
import { useSpanContent, useTraceSpans } from "./trace-queries.ts";

const REGION_KEYS_PRIORITY = 1;

const SPANS_ONLY = ["spans"] as const;
const SPANS_AND_LINKS = ["spans", "links"] as const;

function linkKey(link: SpanLink) {
  return `${link.trace_id}:${link.span_id}`;
}

function traceDuration(spans: Span[]) {
  return spans.reduce((end, span) => Math.max(end, span.offset_ms + span.duration_ms), 0);
}

interface TraceSpansPageProps {
  traceId: string;
  spanId: string | undefined;
  onBack: () => void;
  onOpenLogs: (spanId?: string) => void;
  onOpenTrace: (traceId: string, spanId: string) => void;
}

export function TraceSpansPage({
  traceId,
  spanId,
  onBack,
  onOpenLogs,
  onOpenTrace,
}: TraceSpansPageProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [showCriticalPath, setShowCriticalPath] = useState(false);

  const detailsRef = useRef<ScrollBoxRenderable>(null);

  const traceSpans = useTraceSpans(traceId);
  const { data: spans } = traceSpans;
  const [root] = spans;
  const durationMs = traceDuration(spans);
  const hiddenCounts = new Map(
    spans.flatMap((span, index) =>
      collapsed.has(span.span_id) ? [[span.span_id, descendantCount(spans, index)] as const] : [],
    ),
  );

  const shown = visibleSpans(spans, collapsed);
  const [selectedIndex, select, selectKey] = useSelection(shown, (span) => span.span_id, spanId);
  const selected = shown[selectedIndex];
  const detailed = useDeferredValue(selected);
  const selectedChildren = descendantCount(spans, spans.indexOf(selected ?? spans[0]!));

  const spanContent = useSpanContent(traceId, detailed?.span_id);
  const links = spanContent.data?.links ?? [];
  const [linkIndex, selectLink] = useSelection(links, (link) => linkKey(link));
  const link = links[linkIndex];
  const linkedSpanIndex =
    link?.trace_id === traceId ? spans.findIndex((span) => span.span_id === link.span_id) : -1;
  const canOpenLink =
    linkedSpanIndex !== -1 || (link !== undefined && link.trace_id !== traceId && link.has_trace);

  const [region, stepRegion, focusRegion] = useRegion(
    links.length > 0 ? SPANS_AND_LINKS : SPANS_ONLY,
  );

  function toggleCollapsed(spanId: string) {
    setCollapsed((collapsed) => {
      const next = new Set(collapsed);
      if (!next.delete(spanId)) {
        next.add(spanId);
      }
      return next;
    });
  }

  function openLink(link: SpanLink) {
    if (linkedSpanIndex !== -1) {
      const ancestors = new Set(ancestorIds(spans, link.span_id));
      setCollapsed((collapsed) => new Set([...collapsed].filter((id) => !ancestors.has(id))));
      selectKey(link.span_id);
      stepRegion(-1);
    } else {
      onOpenTrace(link.trace_id, link.span_id);
    }
  }

  return (
    <box flexGrow={1}>
      {traceSpans.isError ? (
        <Placeholder text="Failed to load trace" variant="error" />
      ) : root === undefined || detailed === undefined ? (
        <Placeholder text="This trace is no longer available" />
      ) : (
        <>
          <TraceHeader traceId={traceId} root={root} spans={spans} durationMs={durationMs} />
          <Split>
            <FocusScope focused={region === "spans"} onFocusRequest={() => focusRegion("spans")}>
              <SpanWaterfall
                spans={shown}
                selectedIndex={selectedIndex}
                onSelect={(action) => select(action)}
                traceDurationMs={durationMs}
                hiddenCounts={hiddenCounts}
                criticalPath={showCriticalPath ? criticalPath(spans) : undefined}
              />
            </FocusScope>
            <SpanDetails key={detailed.span_id} ref={detailsRef} traceId={traceId} span={detailed}>
              <FocusScope focused={region === "links"} onFocusRequest={() => focusRegion("links")}>
                <LinkList
                  links={links}
                  traceId={traceId}
                  selectedIndex={linkIndex}
                  onSelect={(index) => selectLink(index)}
                />
              </FocusScope>
            </SpanDetails>
          </Split>
        </>
      )}
      <KeyHints>
        <Key name="escape" onPress={() => onBack()}>
          back
        </Key>
        <Key name="l" onPress={() => onOpenLogs()}>
          logs
        </Key>
        <FocusScope focused={region === "spans"}>
          {selected !== undefined && (
            <Key
              name="shift+l"
              description="logs of the selected span"
              onPress={() => onOpenLogs(selected.span_id)}
            />
          )}
          {shown.some((span) => span.is_error) && (
            <StepKeys
              forward="e"
              backward="shift+e"
              backwardDescription="previous error"
              onStep={(step) =>
                select((index) => findNextIndex(shown, index, step, (span) => span.is_error))
              }
            >
              next error
            </StepKeys>
          )}
          {selected !== undefined && selectedChildren > 0 && (
            <Key
              name="space"
              description={
                collapsed.has(selected.span_id)
                  ? "expand the span's children"
                  : "collapse the span's children"
              }
              onPress={() => toggleCollapsed(selected.span_id)}
            >
              {collapsed.has(selected.span_id) ? "unfold" : "fold"}
            </Key>
          )}
          <Key
            name="c"
            description={showCriticalPath ? "show every span" : "highlight the critical path"}
            onPress={() => setShowCriticalPath((show) => !show)}
          >
            {showCriticalPath ? "all spans" : "critical"}
          </Key>
          {selected !== undefined && (
            <>
              <CopyKey name="y" text={selected.span_id} description="copy the span's ID">
                copy id
              </CopyKey>
              <CopyKey name="shift+y" text={traceId} description="copy the trace's ID" />
            </>
          )}
        </FocusScope>
        {selected !== undefined && <ScrollKeys target={detailsRef} />}
        <FocusScope focused={region === "links"}>
          <StepKeys
            forward="down"
            backward="up"
            description="next link"
            backwardDescription="previous link"
            onStep={(step) => selectLink((index) => index + step)}
          />
          <StepKeys
            forward="j"
            backward="k"
            description="next link"
            backwardDescription="previous link"
            onStep={(step) => selectLink((index) => index + step)}
          />
          {link !== undefined && canOpenLink && (
            <Key name="return" onPress={() => openLink(link)}>
              open link
            </Key>
          )}
        </FocusScope>
        <PauseKey />
        <StepKeys
          forward="tab"
          backward="shift+tab"
          priority={REGION_KEYS_PRIORITY}
          description="next region"
          backwardDescription="previous region"
          onStep={(step) => stepRegion(step)}
        />
      </KeyHints>
    </box>
  );
}
