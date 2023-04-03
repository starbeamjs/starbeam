import type { Reactive, ReactiveValue } from "@starbeam/interfaces";
import { CachedFormula, Formula } from "@starbeam/reactive";

export function FormulaList<T, U>(
  list: Iterable<T>,
  {
    key,
    map,
  }: {
    key: (item: T) => unknown;
    map: (item: T) => U;
  }
): Reactive<readonly U[]> {
  const prev = new Map<unknown, ReactiveValue<U>>();

  return Formula(() => {
    const result: U[] = [];
    for (const item of list) {
      const k = key(item);
      const r = prev.get(k);
      if (r) {
        result.push(r.read());
      } else {
        const newR = CachedFormula(() => map(item));
        result.push(newR.current);
        prev.set(k, newR);
      }
    }
    return result;
  });
}
