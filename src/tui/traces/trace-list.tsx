import { useBindings } from "@opentui/keymap/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";

import { useConnection } from "../connection.ts";
import { FocusScope, useFocused } from "../focus.tsx";
import { Placeholder } from "../placeholder.tsx";
import TRACE_COUNT_SQL from "./trace-count.sql" with { type: "text" };
import { TraceFilterBar } from "./trace-filter-bar.tsx";
import TRACE_LIST_SQL from "./trace-list.sql" with { type: "text" };
import { TraceTable } from "./trace-table.tsx";
import { nextSortColumn, Trace, type TraceSort } from "./trace.ts";

const MAX_TRACES = 500;
const POLL_INTERVAL_MS = 1000;

const TraceCount = z.object({
  total_count: z.number(),
});

const NEWEST_FIRST: TraceSort = {
  column: "start_time",
  descending: true,
};

export function TraceList() {
  const connection = useConnection();
  const focused = useFocused();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [sort, setSort] = useState(NEWEST_FIRST);
  const { status, data: traces = [] } = useQuery({
    queryKey: ["traces", { search, errorsOnly, sort }],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(TRACE_LIST_SQL, {
        limit: MAX_TRACES,
        pattern: `%${search}%`,
        errorsOnly,
        sortBy: sort.column,
        direction: sort.descending ? -1 : 1,
      });
      const rows = reader.getRowObjectsJS();
      return Trace.array().parse(rows);
    },
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["traces", "count"],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(TRACE_COUNT_SQL);
      const [row] = reader.getRowObjectsJS();
      return TraceCount.parse(row).total_count;
    },
    refetchInterval: POLL_INTERVAL_MS,
  });

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
          desc: "errors",
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
            setSort((sort) => ({ column: nextSortColumn(sort.column), descending: true }));
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
        { key: "e", cmd: "traces.toggle-errors-only" },
        { key: "o", cmd: "traces.next-sort" },
        { key: "shift+o", cmd: "traces.reverse-sort" },
      ],
    }),
    [focused, searching, search],
  );

  const filtered = search !== "" || errorsOnly;

  function renderTraces() {
    if (status === "error") {
      return <Placeholder text="Failed to load traces" variant="error" />;
    }
    if (status === "pending" || traces.length === 0) {
      return <Placeholder text={filtered ? "No traces match" : "Waiting for traces..."} />;
    }
    return (
      <FocusScope focused={!searching}>
        <TraceTable traces={traces} sort={sort} />
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
