import type { Attributes } from "#tui/query/attributes.ts";
import { compareText } from "#utils/compare-text.ts";

export function attributeValues(attributeSets: Attributes[]) {
  const byKey = new Map<string, { values: Set<string>; setCount: number }>();

  for (const attributes of attributeSets) {
    for (const { key, value } of attributes) {
      const entry = byKey.getOrInsertComputed(key, () => ({
        values: new Set<string>(),
        setCount: 0,
      }));
      entry.values.add(value ?? "null");
      entry.setCount++;
    }
  }

  return [...byKey].map(([key, { values, setCount }]) => ({
    key,
    values: [...values].sort((a, b) => compareText(a, b)),
    setCount,
  }));
}
