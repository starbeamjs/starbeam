import type { Reactive, ReactiveCore } from "@starbeam/interfaces";

import { Formula } from "../formula/formula.js";
import type {
  AssimilatedResourceReturn,
  ResourceBlueprint,
  ResourceReturn,
} from "../resource/resource.js";
import { Resource } from "../resource/resource.js";

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
  const prev = new Map<unknown, ReactiveCore>();

  return Resource(({ use }) => {
    const result: ReactiveCore[] = [];
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
  const prev = new Map<unknown, ReactiveCore<U>>();

  return Formula(() => {
    const result: U[] = [];
    for (const item of list) {
      const k = key(item);
      const r = prev.get(k);
      if (r) {
        result.push(r.read());
      } else {
        const newR = Formula(() => map(item));
        result.push(newR.current);
        prev.set(k, newR);
      }
    }
    return result;
  });
}
