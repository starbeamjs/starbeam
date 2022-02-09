export type Entry = [key: PropertyKey, value: unknown];
export type Entries = Entry[] | readonly Entry[];

export type ObjectType = Record<PropertyKey, unknown>;

/**
 * Core Utilities
 */

type DeepWritable<O> = {
  -readonly [P in keyof O]: DeepWritable<O[P]>;
};

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  // From https://stackoverflow.com/a/50375286
  k: infer I
) => void
  ? I
  : never;

type PickByValue<O extends ObjectType, V extends O[keyof O]> = Pick<
  // From https://stackoverflow.com/a/55153000
  O,
  { [K in keyof O]: O[K] extends V ? K : never }[keyof O]
>;

type UnionObjectFromArrayOfPairs<A extends Entries> =
  DeepWritable<A> extends (infer R)[]
    ? R extends [infer key, infer val]
      ? { [prop in key & PropertyKey]: val }
      : never
    : never;

type MergeIntersectingObjects<O> = {
  [key in keyof O]: O[key];
};

export type EntriesToObject<A extends Entries> = MergeIntersectingObjects<
  UnionToIntersection<UnionObjectFromArrayOfPairs<A>>
>;

/**
 * Object.entries
 *
 */

export type ObjectEntries<O extends ObjectType> = {
  // From https://stackoverflow.com/a/60142095
  [K in keyof O]: [keyof PickByValue<O, O[K]>, O[K]];
}[keyof O][];

/**
 * Object.fromEntries
 */
