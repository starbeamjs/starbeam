import type { Diff } from "@starbeam/interfaces";

export function diff<T>(
  prev: Set<T> | ReadonlySet<T>,
  next: Set<T> | ReadonlySet<T>
): Diff<T> {
  const add = new Set<T>();
  const remove = new Set<T>();

  for (const internal of prev) {
    if (!next.has(internal)) {
      remove.add(internal);
    }
  }

  for (const internal of next) {
    if (!prev.has(internal)) {
      add.add(internal);
    }
  }

  return { add, remove };
}

const EMPTY = { add: new Set(), remove: new Set() };
diff.empty = <T>() => EMPTY as Diff<T>;
