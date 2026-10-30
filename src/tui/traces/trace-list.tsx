import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { cycle } from "../../utils/cycle.ts";
import { FocusScope, useFocused } from "../focus.tsx";
import { Placeholder } from "../placeholder.tsx";
import { TraceFilterBar } from "./trace-filter-bar.tsx";
import { useTraceList, useTraceTotalCount } from "./trace-queries.ts";
import { TraceTable } from "./trace-table.tsx";
import { TRACE_SORT_COLUMNS, type TraceSort } from "./trace.ts";

const NEWEST_FIRST: TraceSort = {
  column: "start_time",
  descending: true,
};

interface TraceListProps {
  onOpen: (traceId: string) => void;
}

export function TraceList({ onOpen }: TraceListProps) {
  const focused = useFocused();

  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [sort, setSort] = useState(NEWEST_FIRST);

  const traceList = useTraceList({ search, errorsOnly, sort });
  const traceTotalCount = useTraceTotalCount();

  const { data: traces = [] } = traceList;
  const { data: totalCount = 0 } = traceTotalCount;

  const isPending = traceList.isPending || traceTotalCount.isPending;
  const isError = traceList.isError || traceTotalCount.isError;

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        {
          name: "traces.search",
          desc: "search",
          enabled: !searching,
          run() {
            setSearching(true);
          },
        },
        {
          name: "traces.apply-search",
          desc: "apply",
          enabled: searching,
          run() {
            setSearching(false);
          },
        },
        {
          name: "traces.clear-search",
          desc: "clear",
          enabled: searching || search !== "",
          run() {
            setSearch("");
            setSearching(false);
          },
        },
        {
          name: "traces.toggle-errors-only",
          desc: "status",
          enabled: !searching,
          run() {
            setErrorsOnly((errorsOnly) => !errorsOnly);
          },
        },
        {
          name: "traces.next-sort",
          desc: "sort",
          enabled: !searching,
          run() {
            setSort((sort) => ({
              column: cycle(TRACE_SORT_COLUMNS, sort.column, 1),
              descending: true,
            }));
          },
        },
        {
          name: "traces.reverse-sort",
          desc: "reverse",
          enabled: !searching,
          run() {
            setSort((sort) => ({ ...sort, descending: !sort.descending }));
          },
        },
      ],
      bindings: [
        { key: "/", cmd: "traces.search" },
        { key: "return", cmd: "traces.apply-search" },
        { key: "escape", cmd: "traces.clear-search" },
        { key: "s", cmd: "traces.toggle-errors-only" },
        { key: "o", cmd: "traces.next-sort" },
        { key: "shift+o", cmd: "traces.reverse-sort" },
      ],
    }),
    [focused, searching, search],
  );

  const filtered = search !== "" || errorsOnly;

  function renderTraces() {
    if (isError) {
      return <Placeholder text="Failed to load traces" variant="error" />;
    }
    if (isPending || traces.length === 0) {
      return <Placeholder text={filtered ? "No traces match" : "Waiting for traces..."} />;
    }
    return (
      <FocusScope focused={!searching}>
        <TraceTable traces={traces} sort={sort} onOpen={(traceId) => onOpen(traceId)} />
      </FocusScope>
    );
  }

  return (
    <box flexGrow={1}>
      <TraceFilterBar
        search={search}
        searching={searching}
        errorsOnly={errorsOnly}
        shownCount={traces.length}
        totalCount={totalCount}
        onSearchInput={(search) => setSearch(search)}
      />
      {renderTraces()}
    </box>
  );
}
