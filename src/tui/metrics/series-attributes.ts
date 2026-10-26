import type { Attributes } from "../attributes.ts";

const collator = new Intl.Collator(undefined, { numeric: true });

export function compareValues(a: string, b: string) {
  return collator.compare(a, b);
}

export function attributeValues(attributeSets: Attributes[]) {
  const byKey = new Map<string, { values: Set<string>; setCount: number }>();
  for (const attributes of attributeSets) {
    for (const { key, value } of attributes) {
      const entry = byKey.get(key) ?? { values: new Set<string>(), setCount: 0 };
      entry.values.add(value ?? "null");
      entry.setCount++;
      byKey.set(key, entry);
    }
  }
  return [...byKey].map(([key, { values, setCount }]) => ({
    key,
    values: [...values].sort((a, b) => compareValues(a, b)),
    setCount,
  }));
}
