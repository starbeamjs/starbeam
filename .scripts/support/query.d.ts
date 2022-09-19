import type { Package } from "./packages.js";
declare class AllFilter {
    #private;
    static empty(): AllFilter;
    readonly type = "ok";
    readonly kind = "all";
    constructor(filters: SingleFilter[]);
    hasFilters(): boolean;
    filters(key: FilterKey): boolean;
    add(filter: SingleFilter): void;
    match(pkg: Package): boolean;
}
declare class AnyFilter {
    #private;
    static empty(): AnyFilter;
    readonly type = "ok";
    readonly kind = "any";
    constructor(filters: SingleFilter[]);
    hasFilters(): boolean;
    add(filter: SingleFilter): void;
    match(pkg: Package): boolean;
}
export declare class Query {
    #private;
    static readonly all: Query;
    static empty(): Query;
    constructor(any: AnyFilter, all: AllFilter, errors: ParseError[]);
    and(filter: SingleFilter): Query;
    and(key: FilterKey, value?: string | boolean): Query;
    or(filter: SingleFilter): Query;
    or(key: FilterKey, value?: string | boolean): Query;
    unifies(filter: FilterKey): boolean;
    get errors(): ParseError[] | null;
    match(pkg: Package): boolean;
}
export type FilterKey = "typescript" | "private" | "name" | "scope";
export declare class SingleFilter {
    readonly key: FilterKey;
    readonly value: string | boolean;
    static ok(key: FilterKey, matches?: string | boolean): SingleFilter;
    static err(source: string, reason: string): ParseError;
    readonly type = "ok";
    readonly kind = "single";
    constructor(key: FilterKey, value: string | boolean);
    match(pkg: Package): boolean;
}
declare class ParseError {
    readonly source: string;
    readonly message: string;
    readonly type = "error";
    constructor(source: string, message: string);
    log(): void;
}
type OkFilter = SingleFilter | AnyFilter | AllFilter;
export type ParsedFilter = OkFilter | ParseError;
export declare function parse(query: string): SingleFilter | ParseError;
export declare function formatScope(scope: string): string;
export {};
//# sourceMappingURL=query.d.ts.map