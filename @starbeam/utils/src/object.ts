import type { InferReturn } from "./any.js";

type Entry<T> = {
  [P in keyof T]: [P, T[P]];
}[keyof T];

export function entries<T>(object: T): readonly Entry<T>[] {
  return Object.entries(object) as InferReturn;
}

type TupleUnion<U extends PropertyKey, R extends PropertyKey[] = []> = {
  [S in U]: Exclude<U, S> extends never
    ? [...R, S]
    : TupleUnion<Exclude<U, S>, [...R, S]>;
}[U] &
  PropertyKey[];

export function keys<T>(object: T): TupleUnion<keyof T & string> {
  return Object.entries(object) as InferReturn;
}

type Value<T> = T[keyof T];

export function values<T>(object: T): readonly Value<T>[] {
  return Object.values(object);
}

type MapValues<O, U> = {
  [P in keyof O]: U;
};

export function mapObject<O, U>(
  object: O,
  mapper: <K extends keyof O>(value: O[K], key: K) => U
): MapValues<O, U> {
  return fromEntries(
    entries(object).map(
      ([key, value]) => [key, mapper(value, key)] as [keyof O, U]
    )
  ) as MapValues<O, U>;
}
export type ArrayElement<A> = A extends (infer T)[] ? T : never;
type Cast<X, Y> = X extends Y ? X : Y;

type InferEntries<T> = RemoveReadonly<T> extends (infer T1)[] ? T1 : never;

type Q3 = InferEntries<[["a", 1], ["b", 2]]>;

type FromEntries<T extends AnyEntries> = InferEntries<T> extends infer E
  ? {
      [P in E as EntryKey<P>]: EntryValue<P>;
    }
  : never;

type AnyEntry = [PropertyKey, any] | readonly [PropertyKey, any];
type AnyEntries = readonly AnyEntry[];
type EntryKey<Tuple> = Cast<
  Tuple extends [infer K, any] ? K : never,
  PropertyKey
>;
type EntryValue<Tuple> = Tuple extends [any, infer V] ? V : never;

type RemoveReadonly<T> = {
  -readonly [P in keyof T]: RemoveReadonly<T[P]>;
};

type NarrowArray<P extends readonly unknown[]> = P &
  readonly Readonly<P[number]>[];

export function fromEntries<E extends readonly (readonly [PropertyKey, any])[]>(
  entries: E
): FromEntries<E> {
  return Object.fromEntries(entries) as InferReturn;
}
