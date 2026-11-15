export interface Sort<C> {
  column: C;
  descending: boolean;
}

export function sortParams<C>({ column, descending }: Sort<C>) {
  return { sortBy: column, direction: descending ? -1 : 1 };
}
