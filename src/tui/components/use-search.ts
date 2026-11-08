import { useState } from "react";

export function useSearch() {
  const [text, setText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  return {
    text,
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
