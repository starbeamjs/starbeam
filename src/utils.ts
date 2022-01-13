import { verified } from "./strippable/assert";
import { has } from "./strippable/minimal";
import { as } from "./strippable/verify-context";

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

export class NonemptyList<T> {
  static of<T>(list: [T, ...(readonly T[])]): NonemptyList<T> {
    return new NonemptyList(list);
  }

  static verify<T>(list: readonly T[]): NonemptyList<T> {
    return NonemptyList.of(verified(list, has.items, as(`non-empty list`)));
  }

  readonly #list: [T, ...(readonly T[])];

  private constructor(list: [T, ...(readonly T[])]) {
    this.#list = list;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.#list[Symbol.iterator]();
  }

  asArray(): readonly T[] {
    return this.#list;
  }

  pushing(...content: readonly T[]): NonemptyList<T> {
    return new NonemptyList([...this.#list, ...content]);
  }

  takeBack(): [readonly T[], T] {
    let item = this.#list.pop() as T;
    return [this.#list, item];
  }

  takeFront(): [T, readonly T[]] {
    let item = this.#list.shift() as T;
    return [item, this.#list];
  }

  *reversed(): IterableIterator<T> {
    for (let i = this.#list.length - 1; i >= 0; i--) {
      yield this.#list[i];
    }
  }

  get first(): T {
    return this.#list[0];
  }

  get last(): T {
    return this.#list[this.#list.length - 1];
  }
}

export function tap<T>(value: T, updates: (value: T) => void): T {
  updates(value);
  return value;
}

export class Pipe<T> {
  static of<T>(value: T): Pipe<T> {
    return new Pipe(value);
  }

  private constructor(readonly value: T) {}

  to<U>(pipe: (input: T) => U): Pipe<U> {
    let piped = pipe(this.value);
    return Pipe.of(piped);
  }
}

export function pipe<T>(value: T): Pipe<T> {
  return Pipe.of(value);
}
