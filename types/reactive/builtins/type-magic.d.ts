export declare type Entry = [key: PropertyKey, value: unknown];
export declare type Entries = Entry[] | readonly Entry[];
export declare type ObjectType = Record<PropertyKey, unknown>;
/**
 * Core Utilities
 */
declare type DeepWritable<O> = {
    -readonly [P in keyof O]: DeepWritable<O[P]>;
};
declare type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
declare type PickByValue<O extends ObjectType, V extends O[keyof O]> = Pick<O, {
    [K in keyof O]: O[K] extends V ? K : never;
}[keyof O]>;
declare type UnionObjectFromArrayOfPairs<A extends Entries> = DeepWritable<A> extends (infer R)[] ? R extends [infer key, infer val] ? {
    [prop in key & PropertyKey]: val;
} : never : never;
declare type MergeIntersectingObjects<O> = {
    [key in keyof O]: O[key];
};
export declare type EntriesToObject<A extends Entries> = MergeIntersectingObjects<UnionToIntersection<UnionObjectFromArrayOfPairs<A>>>;
/**
 * Object.entries
 *
 */
export declare type ObjectEntries<O extends ObjectType> = {
    [K in keyof O]: [keyof PickByValue<O, O[K]>, O[K]];
}[keyof O][];
export {};
/**
 * Object.fromEntries
 */
