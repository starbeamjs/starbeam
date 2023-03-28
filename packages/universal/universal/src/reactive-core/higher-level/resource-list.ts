import type { Reactive, ReactiveValue } from "@starbeam/interfaces";
import { CachedFormula, Formula } from "@starbeam/reactive";

import type {
  AssimilatedResourceReturn,
  ResourceBlueprint,
  ResourceReturn,
} from "../resource/original-resource.js";
import { Resource } from "../resource/original-resource.js";

export function ResourceList<T, R extends ResourceReturn<unknown>>(
  list: Iterable<T>,
  {
    key,
    map,
  }: {
    key: (item: T) => unknown;
    map: (item: T) => R;
  }
): ResourceBlueprint<AssimilatedResourceReturn<R>[]> {
  const prev = new Map<unknown, ReactiveValue>();

  return Resource(({ use }) => {
    const result: ReactiveValue[] = [];
    for (const item of list) {
      const k = key(item);
      const r = prev.get(k);
      if (r) {
        result.push(use(r));
      } else {
        const newR = use(map(item));
        result.push(newR);
        prev.set(k, newR);
      }
    }

    return result as AssimilatedResourceReturn<R>[];
  });
}

export function FormulaList<T, U>(
  list: Iterable<T>,
  {
    key,
    map,
  }: {
    key: (item: T) => unknown;
    map: (item: T) => U;
  }
): Reactive<U[]> {
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
