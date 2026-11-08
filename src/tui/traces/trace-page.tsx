import type { ScrollBoxRenderable } from "@opentui/core";
import { useRef } from "react";

import { CopyKey } from "#tui/clipboard.tsx";
import { FocusScope } from "#tui/components/focus.tsx";
import { Key, KeyHints, StepKeys } from "#tui/components/key-hints.tsx";
import { Placeholder } from "#tui/components/placeholder.tsx";
import { ScrollKeys } from "#tui/components/scroll-box.tsx";
import { Split } from "#tui/components/split.tsx";
import { useRegion } from "#tui/components/use-region.ts";
import { useSelection } from "#tui/components/use-selection.ts";
import { PauseKey } from "#tui/pause.tsx";
import { findNextIndex } from "#utils/find-next-index.ts";

import { LinkList } from "./link-list.tsx";
import { SpanDetails } from "./span-details.tsx";
import { SpanWaterfall } from "./span-waterfall.tsx";
import type { Span, SpanLink } from "./span.ts";
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

interface TracePageProps {
  traceId: string;
  spanId: string | undefined;
  onBack: () => void;
  onOpenLogs: (spanId?: string) => void;
  onOpenTrace: (traceId: string, spanId: string) => void;
}

export function TracePage({ traceId, spanId, onBack, onOpenLogs, onOpenTrace }: TracePageProps) {
  const traceSpans = useTraceSpans(traceId);
  const detailsRef = useRef<ScrollBoxRenderable>(null);

  const { data: spans = [] } = traceSpans;

  const [selectedIndex, select] = useSelection(spans, (span) => span.span_id, spanId);
  const selected = spans[selectedIndex];

  const [root] = spans;
  const durationMs = traceDuration(spans);

  const spanContent = useSpanContent(traceId, selected?.span_id);
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

  function openLink(link: SpanLink) {
    if (linkedSpanIndex !== -1) {
      select(linkedSpanIndex);
      stepRegion(-1);
    } else {
      onOpenTrace(link.trace_id, link.span_id);
    }
  }

  return (
    <box flexGrow={1}>
      {traceSpans.isError ? (
        <Placeholder text="Failed to load trace" variant="error" />
      ) : root === undefined || selected === undefined ? (
        <Placeholder
          text={traceSpans.isPending ? "Loading trace..." : "This trace is no longer available"}
        />
      ) : (
        <>
          <TraceHeader traceId={traceId} root={root} spans={spans} durationMs={durationMs} />
          <Split>
            <FocusScope focused={region === "spans"} onFocusRequest={() => focusRegion("spans")}>
              <SpanWaterfall
                spans={spans}
                selectedIndex={selectedIndex}
                onSelect={(action) => select(action)}
                traceDurationMs={durationMs}
              />
            </FocusScope>
            <SpanDetails
              key={selected.span_id}
              ref={detailsRef}
              span={selected}
              content={spanContent.data}
              failed={spanContent.isError}
            >
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
            <Key name="shift+l" onPress={() => onOpenLogs(selected.span_id)}>
              span logs
            </Key>
          )}
          {spans.some((span) => span.is_error) && (
            <StepKeys
              forward="e"
              backward="shift+e"
              backwardDescription="previous error"
              onStep={(step) =>
                select((index) => findNextIndex(spans, index, step, (span) => span.is_error))
              }
            >
              next error
            </StepKeys>
          )}
          {selected !== undefined && (
            <>
              <CopyKey name="y" text={selected.span_id}>
                copy span id
              </CopyKey>
              <CopyKey name="shift+y" text={traceId}>
                copy trace id
              </CopyKey>
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
