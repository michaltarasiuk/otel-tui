import type { ScrollBoxRenderable } from "@opentui/core";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useDeferredValue, useRef, useState } from "react";

import { useConnection } from "#query/connection.ts";
import { CopyKey } from "#ui/clipboard.tsx";
import { FocusScope } from "#ui/focus.tsx";
import { Key, KeyHints, ListKeys, StepKeys } from "#ui/key-hints.tsx";
import { PauseKey } from "#ui/pause.tsx";
import { Placeholder } from "#ui/placeholder.tsx";
import { RegionKeys, useRegion } from "#ui/region.tsx";
import { ScrollKeys } from "#ui/scroll-box.tsx";
import { Split } from "#ui/split.tsx";
import { useSelection } from "#ui/use-selection.ts";
import { findNextIndex } from "#utils/cycle.ts";
import { toggle } from "#utils/set.ts";

import { canOpenLink, LinkList } from "./link-list.tsx";
import { SpanDetails } from "./span-details.tsx";
import {
  criticalPath,
  descendantCount,
  expandTo,
  hiddenCounts,
  traceDuration,
  visibleSpans,
} from "./span-tree.ts";
import { SpanWaterfall } from "./span-waterfall.tsx";
import type { SpanLink } from "./span.ts";
import { TraceHeader } from "./trace-header.tsx";
import { spanContentQuery, traceSpansQuery } from "./trace-queries.ts";
import { type MarkedTrace, sameRoot } from "./trace.ts";

interface WaterfallPageProps {
  traceId: string;
  spanId: string | undefined;
  marked: MarkedTrace | undefined;
  onBack: () => void;
  onMark: (marked: MarkedTrace | undefined) => void;
  onCompare: (before: string, after: string) => void;
  onOpenLogs: (spanId?: string) => void;
  onOpenTrace: (traceId: string, spanId: string) => void;
}

export function WaterfallPage({
  traceId,
  spanId,
  marked,
  onBack,
  onMark,
  onCompare,
  onOpenLogs,
  onOpenTrace,
}: WaterfallPageProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [showCriticalPath, setShowCriticalPath] = useState(false);

  const connection = useConnection();
  const traceSpans = useSuspenseQuery(traceSpansQuery(connection, traceId));
  const { data: spans } = traceSpans;
  const [root] = spans;
  const durationMs = traceDuration(spans);

  const shown = visibleSpans(spans, collapsed);
  const selection = useSelection(shown, (span) => span.span_id, spanId);
  const { selected } = selection;
  const deferredSelected = useDeferredValue(selected);

  function selectSpan(spanId: string) {
    setCollapsed((collapsed) => expandTo(spans, collapsed, spanId));
    selection.selectKey(spanId);
  }

  const spanContent = useQuery(spanContentQuery(connection, traceId, deferredSelected?.span_id));
  const links = spanContent.data?.links ?? [];
  const linkSelection = useSelection(links, (link) => link.span_id);
  const link = linkSelection.selected;

  const regions = links.length > 0 ? (["spans", "links"] as const) : (["spans"] as const);
  const [region, setRegion] = useRegion(regions);

  function openLink(link: SpanLink) {
    if (link.trace_id === traceId) {
      selectSpan(link.span_id);
      setRegion("spans");
    } else {
      onOpenTrace(link.trace_id, link.span_id);
    }
  }

  const detailsRef = useRef<ScrollBoxRenderable>(null);

  return (
    <box flexGrow={1}>
      {traceSpans.isError ? (
        <Placeholder text="Failed to load trace" variant="error" />
      ) : root === undefined || deferredSelected === undefined ? (
        <Placeholder text="This trace is no longer available" />
      ) : (
        <>
          <TraceHeader traceId={traceId} root={root} spans={spans} durationMs={durationMs} />
          <Split>
            <FocusScope focused={region === "spans"} onFocusRequest={() => setRegion("spans")}>
              <SpanWaterfall
                spans={shown}
                selection={selection}
                traceDurationMs={durationMs}
                hiddenCounts={hiddenCounts(spans, collapsed)}
                highlighted={showCriticalPath ? criticalPath(spans) : undefined}
              />
            </FocusScope>
            <SpanDetails
              key={deferredSelected.span_id}
              ref={detailsRef}
              traceId={traceId}
              span={deferredSelected}
            >
              <FocusScope focused={region === "links"} onFocusRequest={() => setRegion("links")}>
                <LinkList links={links} traceId={traceId} selection={linkSelection} />
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
        {root !== undefined && (
          <Key
            name="m"
            description={
              marked?.traceId === traceId
                ? "unmark the trace to compare with"
                : "mark the trace to compare with"
            }
            onPress={() =>
              onMark(
                marked?.traceId === traceId
                  ? undefined
                  : { traceId, root: { service_name: root.service_name, name: root.name } },
              )
            }
          />
        )}
        {root !== undefined &&
          marked !== undefined &&
          marked.traceId !== traceId &&
          sameRoot(marked.root, root) && (
            <Key
              name="v"
              description="compare with the marked trace, which has the same root span"
              onPress={() => onCompare(marked.traceId, traceId)}
            >
              compare
            </Key>
          )}
        {selected !== undefined && (
          <>
            <FocusScope focused={region === "spans"}>
              <Key
                name="shift+l"
                description="logs of the selected span"
                onPress={() => onOpenLogs(selected.span_id)}
              />
              {shown.some((span) => span.is_error) && (
                <StepKeys
                  forward="e"
                  backward="shift+e"
                  backwardDescription="previous error"
                  onStep={(step) =>
                    selection.select(
                      findNextIndex(shown, selection.index, step, (span) => span.is_error),
                    )
                  }
                >
                  next error
                </StepKeys>
              )}
              {descendantCount(spans, spans.indexOf(selected)) > 0 && (
                <Key
                  name="space"
                  description={
                    collapsed.has(selected.span_id)
                      ? "expand the span's children"
                      : "collapse the span's children"
                  }
                  onPress={() => setCollapsed((collapsed) => toggle(collapsed, selected.span_id))}
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
              <CopyKey name="y" text={selected.span_id} description="copy the span's ID">
                copy id
              </CopyKey>
              <CopyKey name="shift+y" text={traceId} description="copy the trace's ID" />
            </FocusScope>
            <ScrollKeys target={detailsRef} />
          </>
        )}
        <FocusScope focused={region === "links"}>
          <ListKeys
            description="next link"
            backwardDescription="previous link"
            onStep={(step) => linkSelection.move(step)}
          />
          {link !== undefined && canOpenLink(link, traceId, spans) && (
            <Key name="return" onPress={() => openLink(link)}>
              open link
            </Key>
          )}
        </FocusScope>
        <PauseKey />
        <RegionKeys regions={regions} region={region} onChange={(region) => setRegion(region)} />
      </KeyHints>
    </box>
  );
}
