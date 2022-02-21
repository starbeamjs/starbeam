export declare type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export declare type LastOf<T> = UnionToIntersection<T extends any ? () => T : never> extends () => infer R ? R : never;
export declare type Push<T extends readonly any[], V> = readonly [...T, V];
export declare type TuplifyUnion<T, L = LastOf<T>, N = [T] extends [never] ? true : false> = true extends N ? [] : Push<TuplifyUnion<Exclude<T, L>>, L>;
export declare type Entry<T> = {
    [P in keyof T]: [P, T[P]];
}[keyof T];
//# sourceMappingURL=type-magic.d.ts.map