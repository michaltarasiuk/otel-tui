import { useDeferredValue, useState } from "react";

export function useDeferredState<T>(initial: T) {
  const [state, setState] = useState(initial);
  const deferredState = useDeferredValue(state);

  return [deferredState, setState] as const;
}
