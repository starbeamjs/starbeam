export declare class ValueVariant<D extends string, T> {
    readonly discriminant: D;
    readonly value: T;
    static create<D extends string, T>(discriminant: D, value: T): ValueVariant<D, T>;
    private constructor();
    match<U>(matcher: {
        [P in D]: (value: T) => U;
    }): U;
}
export declare class UnitVariant<D extends string> {
    readonly discriminant: D;
    static create<D extends string>(discriminant: D): UnitVariant<D>;
    private constructor();
    match<U>(matcher: {
        [P in D]: () => U;
    }): U;
}
export declare type Variant<T> = ValueVariant<string, T> | UnitVariant<string>;
export declare type UnitMatcher<V extends UnitVariant<string>> = {
    [P in V["discriminant"]]: () => unknown;
};
export declare type ValueMatcher<V extends ValueVariant<string, unknown>> = {
    [P in V["discriminant"]]: V extends ValueVariant<string, infer T> ? (value: T) => unknown : never;
};
export declare type Matcher<V extends Variant<unknown>> = V extends ValueVariant<string, infer T> ? (value: T) => unknown : V extends UnitVariant<string> ? () => unknown : never;
export declare type Matchers<E extends Variant<unknown>> = {
    [P in E["discriminant"]]: Matcher<E>;
};
export declare type Enum<R extends Record<string, unknown>> = {
    [P in keyof R & string]: R[P] extends void ? UnitVariant<P> : ValueVariant<P, R[P]>;
}[keyof R & string];
export declare type Bool = Enum<{
    true: void;
    false: void;
}>;
export declare type Option<T> = Enum<{
    None: void;
    Some: T;
}>;
