import { useDeferredValue, useState } from "react";

export function useSearch() {
  const [text, setText] = useState("");
  const query = useDeferredValue(text);
  const [isEditing, setIsEditing] = useState(false);

  return {
    text,
    query,
    isEditing,
    setText,
    edit() {
      setIsEditing(true);
    },
    apply() {
      setIsEditing(false);
    },
    clear() {
      setText("");
      setIsEditing(false);
    },
  };
}

export type Search = ReturnType<typeof useSearch>;
