const textCollator = new Intl.Collator(undefined, { numeric: true });

export function compareText(a: string, b: string) {
  return textCollator.compare(a, b);
}
