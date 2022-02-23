/* eslint-disable @typescript-eslint/no-explicit-any */
// Data Types
export type Entry = [PropertyKey, unknown];
export type Entries = Entry[] | readonly Entry[];

// Existing Utils
export type DeepWritable<O> = {
  -readonly [P in keyof O]: DeepWritable<O[P]>;
};
export type UnionToIntersection<T> =
  // From https://stackoverflow.com/a/50375286
  (T extends any ? (k: T) => void : never) extends (k: infer I) => void
    ? I
    : never;

// New Utils
export type UnionObjectFromArrayOfPairs<A extends Entries> =
  DeepWritable<A> extends (infer R)[]
    ? R extends [infer key, infer val]
      ? { [prop in key & PropertyKey]: val }
      : never
    : never;
export type MergeIntersectingObjects<ObjT> = { [key in keyof ObjT]: ObjT[key] };
export type EntriesToObject<A extends Entries> = MergeIntersectingObjects<
  UnionToIntersection<UnionObjectFromArrayOfPairs<A>>
>;
