export function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

export function* enumerate<T>(iterable: Iterable<T>): Iterable<[number, T]> {
  let i = 0;

  for (let item of iterable) {
    yield [i++, item];
  }
}

export type PresentPosition = "first" | "last" | "middle" | "only";
export type EmptyPosition = "empty";

export const Position = {
  hasNext(position: PresentPosition): boolean {
    return position === "first" || position === "middle";
  },

  hasPrev(position: PresentPosition): boolean {
    return position === "last" || position === "middle";
  },
};

const EMPTY = {
  isEmpty: true,
} as const;

const PRESENT = {
  isEmpty: false,
} as const;

export function* positioned<T>(
  iterable: Iterable<T>
): IterableIterator<[T, PresentPosition]> &
  Iterator<[T, PresentPosition], { isEmpty: boolean }> {
  let iterator = iterable[Symbol.iterator]();
  let first = iterator.next();
  let buffer: T;
  let yieldedFirst = false;

  if (first.done) {
    return EMPTY;
  } else {
    buffer = first.value;
  }

  for (let next = iterator.next(); !next.done; ) {
    let current = buffer;
    buffer = next.value;

    if (yieldedFirst) {
      yield [current, "middle"];
    } else {
      yield [current, "first"];
    }
  }

  if (yieldedFirst) {
    yield [buffer, "last"];
  } else {
    yield [buffer, "only"];
  }

  return PRESENT;
}
