const EMPTY_LENGTH = 0;

export type ReadonlyPresentArray<T> = readonly [T, ...T[]];
export type MutablePresentArray<T> = [T, ...T[]];
export type PresentArray<T> = MutablePresentArray<T> | ReadonlyPresentArray<T>;

export type AnyArray<T> = T[] | readonly T[];

type PresentArrayFor<T extends unknown[] | readonly unknown[] | undefined> =
  T extends readonly (infer Item)[] | (infer Item)[]
    ? readonly [Item, ...Item[]]
    : never;

export function isPresentArray<
  T extends unknown[] | readonly unknown[] | undefined
>(list: T): list is T & PresentArrayFor<T> {
  return list && list.length > EMPTY_LENGTH;
}

export function mapArray<T, U>(
  list: PresentArray<T>,
  mapper: (item: T, index: number) => U
): MutablePresentArray<U>;
export function mapArray<T, U>(
  list: T[] | readonly T[],
  mapper: (item: T, index: number) => U
): U[];
export function mapArray<T, U>(
  list: T[] | readonly T[] | PresentArray<T>,
  mapper: (item: T, index: number) => U
): U[] | PresentArray<U> {
  return list.map(mapper);
}

export function mapPresentArray<T, U>(
  list: PresentArray<T>,
  mapper: (item: T, index: number) => U
): PresentArray<U> {
  return list.map(mapper) as PresentArray<U>;
}

export function mapIfPresent<T, U>(
  list: T[] | undefined | null,
  mapper: (item: T, index: number) => U
): MutablePresentArray<U> | undefined;
export function mapIfPresent<T, U>(
  list: readonly T[] | undefined | null,
  mapper: (item: T, index: number) => U
): ReadonlyPresentArray<U> | undefined;
export function mapIfPresent<T, U>(
  list: T[] | readonly T[] | undefined | null,
  mapper: (item: T, index: number) => U
): MutablePresentArray<U> | ReadonlyPresentArray<U> | undefined {
  if (list && isPresentArray(list)) {
    return mapPresentArray(list, mapper);
  } else {
    return;
  }
}

export function ifPresentArray<
  T extends [unknown, ...unknown[]] | readonly [unknown, ...unknown[]],
  U
>(list: T, callback: (value: PresentArrayFor<T>) => U): U;
export function ifPresentArray<T extends unknown[] | readonly unknown[], U>(
  list: T | undefined | null,
  callback: (value: PresentArrayFor<T>) => U
): U | undefined;
export function ifPresentArray<T extends unknown[] | readonly unknown[], U>(
  list: T | undefined | null,
  callback: (value: PresentArrayFor<T>) => U
): U | undefined {
  if (list && isPresentArray(list)) {
    return callback(list);
  } else {
    return;
  }
}

const SINGLE_ITEM = 1;

export function isSingleItemArray<T>(
  list: T[] | readonly T[] | undefined | null
): list is [T] {
  return list?.length === SINGLE_ITEM;
}

export function isEmptyCollection(collection: { size: number }): boolean {
  return collection.size === EMPTY_LENGTH;
}

export function isPresentCollection(collection: { size: number }): boolean {
  return collection.size > EMPTY_LENGTH;
}

export function isEmptyArray<T extends unknown[] | readonly unknown[]>(
  list: T
): list is T & [] {
  return list.length === EMPTY_LENGTH;
}

export function zipArrays<T, U, V>(
  a: T[] | readonly T[],
  b: U[] | readonly U[],
  zipper: (a: T, b: U) => V
): readonly V[] {
  const result: V[] = [];
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    result.push(zipper(a[i]!, b[i]!));
  }
  return result;
}

export function nullifyEmptyArray<U extends unknown[] | readonly unknown[]>(
  list: U
): PresentArrayFor<U> | null {
  return isEmptyArray(list) ? null : (list as unknown as PresentArrayFor<U>);
}

const FIRST_OFFSET = 0;
const TAIL_OFFSET = 1;
const LAST_OFFSET = -1;

export function withoutFirst<T, U extends unknown[]>(
  list: [T, ...U] | readonly [T, ...U]
): U;
export function withoutFirst<T>(list: T[] | readonly T[]): T[];
export function withoutFirst<T>(list: T[] | readonly T[]): T[] {
  return list.slice(TAIL_OFFSET);
}

export function withoutLast<T>(list: T[] | readonly T[]): T[] {
  return list.slice(FIRST_OFFSET, LAST_OFFSET);
}

export function firstNItems<T>(list: T[], n: number): T[] {
  return list.slice(FIRST_OFFSET, n);
}

export function getFirst<I>(
  list: [I, ...unknown[]] | readonly [I, ...unknown[]]
): I;
export function getFirst<T>(list: PresentArray<T>): T;
export function getFirst<T>(list: AnyArray<T> | undefined): T | undefined;
export function getFirst<T>(list: AnyArray<T> | undefined): T | undefined {
  return list?.[FIRST_OFFSET];
}

export function getLast<T>(list: PresentArray<T>): T;
export function getLast<T>(list: T[] | readonly T[] | undefined): T | undefined;
export function getLast<T>(
  list: readonly T[] | T[] | undefined
): T | undefined {
  return isPresentArray(list) ? list[getLastIndex(list)] : undefined;
}

export function getLastIndex(list: PresentArray<unknown>): number;
export function getLastIndex(
  list: unknown[] | readonly unknown[]
): number | undefined;
export function getLastIndex(
  list: unknown[] | readonly unknown[]
): number | undefined {
  if (isPresentArray(list)) {
    return list.length + LAST_OFFSET;
  } else {
    return undefined;
  }
}

const DELETE_ONE = 1;
const MISSING_INDEX = -1;

export function removeItemAt<T>(list: T[], index: number): void {
  if (index !== MISSING_INDEX) {
    list.splice(index, DELETE_ONE);
  }
}

export function removeItem<T>(list: T[], item: T): void {
  removeItemAt(list, list.indexOf(item));
}

export function isArray<T>(
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  value: unknown | readonly T[]
): value is readonly T[];
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export function isArray<T>(value: unknown | T[]): value is T[];
export function isArray(value: unknown): value is unknown[];
export function isArray(value: unknown): boolean {
  return Array.isArray(value);
}
