import type { KeyEvent, Renderable } from "@opentui/core";
import type { Binding, Command } from "@opentui/keymap";
import { useState } from "react";

const SEARCH_BINDINGS = [
  { key: "/", cmd: "search.edit" },
  { key: "return", cmd: "search.apply" },
  { key: "escape", cmd: "search.clear" },
] satisfies Binding<Renderable, KeyEvent>[];

export function useSearch() {
  const [text, setText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  return {
    text,
    isEditing,
    setText,
    commands: [
      {
        name: "search.edit",
        desc: "search",
        enabled: !isEditing,
        run() {
          setIsEditing(true);
        },
      },
      {
        name: "search.apply",
        desc: "apply",
        enabled: isEditing,
        run() {
          setIsEditing(false);
        },
      },
      {
        name: "search.clear",
        desc: "clear",
        enabled: isEditing || text !== "",
        run() {
          setText("");
          setIsEditing(false);
        },
      },
    ] satisfies Command<Renderable, KeyEvent>[],
    bindings: SEARCH_BINDINGS,
  };
}
