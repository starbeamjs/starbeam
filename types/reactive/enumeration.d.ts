/**
 * The Discriminant is the low-level, internal representation of the instance of
 * an enum, and contains the generic (i.e. `Some(T)`).
 */
export declare type Discriminant<S extends string = string> = S;
/**
 * The Variant is the part of the Discriminant that is used in matchers (i.e.
 * the variant of `Some(T)` is `Some`).
 */
declare type Variant<K> = K extends `${infer D}(${string})` ? D : K;
declare type Generics = [discriminant: Discriminant, t: unknown] | [discriminant: Discriminant, t: unknown, u: unknown] | Discriminant;
declare type AsEnum = {
    of: Discriminant;
};
declare type GetMatcherT<G extends Generics, R> = G extends [
    discriminant: string,
    t: infer T,
    u: unknown
] ? (value: T) => R : G extends [string, infer T] ? (value: T) => R : (value?: unknown) => R;
declare type GetMatcherU<G extends Generics, R> = G extends [string, unknown, infer U] ? (value: U) => R : (value?: unknown) => R;
export declare type MatcherValue<G extends Generics, K extends string, R> = HasGeneric<K, "U"> extends true ? GetMatcherU<G, R> : [K] extends [`${string}(${string})`] ? GetMatcherT<G, R> : [K] extends [string] ? () => R : never;
export declare type MatcherFunction<G extends Generics, K extends string, R> = MatcherValue<G, K, R>;
declare type GetT<G extends Generics> = G extends [
    discriminant: Discriminant,
    t: infer T,
    u: unknown
] ? T : G extends [discriminant: string, t: infer T] ? T : never;
declare type GetU<G extends Generics> = G extends [
    discriminant: Discriminant,
    t: unknown,
    u: infer U
] ? U : never;
declare type Matcher<G extends Generics, A extends AsEnum, R> = {
    [P in A["of"] as Variant<P>]: HasGeneric<P, "T"> extends true ? (value: GetT<G>) => R : P extends `${string}(U)` ? (value: GetU<G>) => R : () => R;
};
declare type DiscriminantFor<V, All> = Extract<All, `${V & string}(${string})`>;
export declare type GenericValue<V, T, U> = V extends `${string}(T)` ? T : V extends `${string}(U)` ? U : undefined;
export declare type CaseValue<G extends Generics, All> = G extends [
    infer V,
    infer T,
    infer U
] ? DiscriminantFor<V & string, All> extends infer D ? GenericValue<D, T, U> : never : G extends [infer V, infer T] ? DiscriminantFor<V & string, All> extends infer D ? GenericValue<D, T, never> : never : undefined;
export declare type Destructure<G extends Generics, All> = G extends [
    infer V,
    infer T,
    infer U
] ? DiscriminantFor<V & string, All> extends infer D ? [V, GenericValue<D, T, U>] : never : G extends [infer V, infer T] ? DiscriminantFor<V & string, All> extends infer D ? [V, GenericValue<D, T, never>] : never : [G];
export declare class Case<G extends Generics, A extends AsEnum> {
    readonly variant: G extends unknown[] ? G[0] : G;
    readonly value: Destructure<G, A["of"]>;
    match<U>(matcher: Matcher<G, A, U>): U;
}
declare type EnumConstructor<K extends Discriminant> = {
    new (key: K): Case<K, {
        of: K;
    }>;
    new <T>(key: K, value?: T): Case<K extends `${infer D}(${string})` ? [Discriminant<D>, T extends undefined ? never : T] : K, {
        of: K;
    }>;
    new <T, U>(key: K, value?: T | U): Case<K extends `${infer D}(T)` ? [Discriminant<D>, T, never] : K extends `${infer D}(U)` ? [Discriminant<D>, never, U] : K, {
        of: K;
    }>;
};
declare type HasGeneric<K extends Discriminant, G extends string> = true extends {
    [P in K]: K extends `${string}(${G})` ? true : false;
}[K] ? true : false;
declare type CaseInstance<G extends Generics, A extends AsEnum, I> = Case<G, A> & ThisType<Case<G, A> & I>;
declare type Class = abstract new (...args: any) => any;
declare type AnyEnumClass<P extends string, U> = abstract new (discriminant: P, value?: any) => U;
export declare type StaticMethod<P extends string> = <This extends AnyEnumClass<P, U>, // abstract new (discriminant: P, value?: any) => U,
U>(this: This) => U extends Case<any, any> ? U : InstanceType<This>;
export declare type EnumStatic<K extends Discriminant, P extends K, I extends Case<Generics, AsEnum>> = HasGeneric<K, "U"> extends true ? P extends `${infer D}(U)` ? <U>(value: U) => CaseInstance<[Discriminant<D>, never, U], {
    of: K;
}, I> : P extends `${infer D}(T)` ? <T>(value: T) => CaseInstance<[Discriminant<D>, T, never], {
    of: K;
}, I> : StaticMethod<P> : HasGeneric<K, "T"> extends true ? HasGeneric<P, "T"> extends true ? <This extends abstract new (discriminant: P, value: T) => U, U, T>(this: This, value: T) => U : StaticMethod<P> : HasGeneric<K, string> extends true ? never & `An Enum's generics must be either T or U, but you specified ${K}` : <This extends Class>(this: This) => InstanceType<This>;
declare type EnumClass<K extends Discriminant, C extends EnumConstructor<K>> = C & {
    [P in K as Variant<P>]: EnumStatic<K, P, InstanceType<C>>;
};
declare type EnumClassFor<K extends Discriminant> = EnumClass<K, EnumConstructor<K>>;
export declare function Enum<K extends string[]>(...keys: K): EnumClassFor<Discriminant<K[number]>>;
export {};
