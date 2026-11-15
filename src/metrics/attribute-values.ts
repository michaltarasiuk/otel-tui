import type { Attributes } from "#telemetry/attributes.ts";
import { compareText } from "#utils/text.ts";

export function attributeValues(attributeSets: Attributes[]) {
  const attributesByKey = Map.groupBy(attributeSets.flat(), (attribute) => attribute.key);
  return [...attributesByKey].map(([key, attributes]) => {
    const values = new Set(attributes.map((attribute) => attribute.value ?? "null"));
    return { key, values: [...values].sort((a, b) => compareText(a, b)), count: attributes.length };
  });
}

export type AttributeValues = ReturnType<typeof attributeValues>[number];
