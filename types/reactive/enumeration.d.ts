/**
 * The Discriminant is the low-level, internal representation of the instance of
 * an enum, and contains the generic (i.e. `Some(T)`).
 */
export declare type Discriminant = string;
export declare type Variant<D extends Discriminant> = D extends `${infer V}(${string})` ? V : D;
export declare type Matcher<D extends Discriminant, T, U, Out> = D extends `${string}(T)` ? <V extends Out>(value: T) => V : D extends `${string}(U)` ? <V extends Out>(value: U) => V : <V extends Out>() => V;
export declare type Matchers<D extends Discriminant, Out, T = never, U = never> = {
    [P in D]: Matcher<P, T, U, Out>;
};
export interface EnumInstance0<D extends Discriminant> {
    match<Out>(matcher: {
        [P in D]: () => Out;
    }): Out;
}
export interface EnumInstance1<D extends Discriminant, T> {
    match<Out>(matcher: {
        [P in D as Variant<P>]: true extends HasGeneric<P, "T"> ? (value: T) => Out : () => Out;
    }): Out;
}
export interface EnumInstance2<D extends Discriminant, T, U> {
    match<Out>(matcher: {
        [P in D as Variant<P>]: true extends HasGeneric<P, "T"> ? (value: T) => Out : true extends HasGeneric<P, "U"> ? (value: U) => Out : () => Out;
    }): Out;
}
declare type EnumClass0<K extends string> = (abstract new (discriminant: K) => EnumInstance0<K>) & {
    [P in K]: <This extends abstract new (discriminant: P) => Instance, Instance>(this: This) => Instance;
};
declare type EnumClass1<K extends string> = {
    new <T>(...args: K extends `${string}(T)` ? [K, T] : [K]): EnumInstance1<K, T>;
} & {
    [P in K as Variant<P>]: P extends `${string}(T)` ? <This extends abstract new (discriminant: P, value: T) => Instance, Instance, T>(this: This, value: T) => Instance : <This extends abstract new (discriminant: P) => Instance, Instance>(this: This) => Instance;
};
declare type EnumClass2<K extends string> = {
    new <T, U>(...args: K extends `${string}(T)` ? [K, T, never] : K extends `${string}(U)` ? [K, never, U] : [K]): EnumInstance2<K, T, U>;
} & {
    [P in K as Variant<P>]: P extends `${string}(T)` ? <This extends abstract new (discriminant: P, t: T, u: never) => Instance, Instance, T>(this: This, value: T) => Instance : P extends `${string}(U)` ? <This extends abstract new (discriminant: P, t: never, value: U) => Instance, Instance, U>(this: This, value: U) => Instance : <This extends abstract new (discriminant: P) => Instance, Instance>(this: This) => Instance;
};
declare type HasGeneric<K extends string, G extends string> = {
    [P in K]: P extends `${string}(${G})` ? true : false;
}[K];
declare type EnumClass<K extends string> = true extends HasGeneric<K, "U"> ? EnumClass2<K> : true extends HasGeneric<K, "T"> ? EnumClass1<K> : EnumClass0<K>;
export declare function Enum<K extends string[]>(...keys: K): EnumClass<K[number]>;
export {};
