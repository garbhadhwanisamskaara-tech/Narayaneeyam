/**
 * The API caps every response at 1,000 rows. Pages through a query with
 * .range() until a page comes back short. `build` must return a fresh query
 * each call and should include a stable .order() so pages don't overlap.
 * Throws on the first page error — never returns silently truncated data.
 */
export const PAGE_SIZE = 1000;

export async function fetchAllPages<T>(build: () => any): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message ?? String(error));
    const page = (data ?? []) as T[];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return all;
}
