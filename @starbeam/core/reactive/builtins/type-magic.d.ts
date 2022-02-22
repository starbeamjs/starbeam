export declare type Entry = [PropertyKey, unknown];
export declare type Entries = Entry[] | readonly Entry[];
export declare type DeepWritable<O> = {
    -readonly [P in keyof O]: DeepWritable<O[P]>;
};
export declare type UnionToIntersection<T> = (T extends any ? (k: T) => void : never) extends (k: infer I) => void ? I : never;
export declare type UnionObjectFromArrayOfPairs<A extends Entries> = DeepWritable<A> extends (infer R)[] ? R extends [infer key, infer val] ? {
    [prop in key & PropertyKey]: val;
} : never : never;
export declare type MergeIntersectingObjects<ObjT> = {
    [key in keyof ObjT]: ObjT[key];
};
export declare type EntriesToObject<A extends Entries> = MergeIntersectingObjects<UnionToIntersection<UnionObjectFromArrayOfPairs<A>>>;
//# sourceMappingURL=type-magic.d.ts.map