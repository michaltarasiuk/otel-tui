import { useDeferredValue, useState } from "react";

export function useDeferredState<T>(initial: T) {
  const [state, setState] = useState(initial);
  const shown = useDeferredValue(state);

  return [shown, setState] as const;
}
