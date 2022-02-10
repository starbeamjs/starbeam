import { verified } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
import type { OpaqueAlias } from "../strippable/wrapper";

declare const DISCRIMINANT: unique symbol;

/**
 * The Discriminant is the low-level, internal representation of the instance of
 * an enum, and contains the generic (i.e. `Some(T)`).
 */
export type Discriminant<S extends string = string> = S;

/**
 * The Variant is the part of the Discriminant that is used in matchers (i.e.
 * the variant of `Some(T)` is `Some`).
 */
type Variant<K> = K extends `${infer D}(${string})` ? D : K;

type Generics =
  | [discriminant: Discriminant, t: unknown]
  | [discriminant: Discriminant, t: unknown, u: unknown]
  | Discriminant;

type AsEnum = { of: Discriminant };

type GetMatcherT<G extends Generics, R> = G extends [
  discriminant: string,
  t: infer T,
  u: unknown
]
  ? (value: T) => R
  : G extends [string, infer T]
  ? (value: T) => R
  : (value?: unknown) => R;

type GetMatcherU<G extends Generics, R> = G extends [string, unknown, infer U]
  ? (value: U) => R
  : (value?: unknown) => R;

export type MatcherValue<G extends Generics, K extends string, R> = HasGeneric<
  K,
  "U"
> extends true
  ? GetMatcherU<G, R>
  : [K] extends [`${string}(${string})`]
  ? GetMatcherT<G, R>
  : [K] extends [string]
  ? () => R
  : never;

export type MatcherFunction<
  G extends Generics,
  K extends string,
  R
> = MatcherValue<G, K, R>;

type GetT<G extends Generics> = G extends [
  discriminant: Discriminant,
  t: infer T,
  u: unknown
]
  ? T
  : G extends [discriminant: string, t: infer T]
  ? T
  : never;

type GetU<G extends Generics> = G extends [
  discriminant: Discriminant,
  t: unknown,
  u: infer U
]
  ? U
  : never;

type Matcher<G extends Generics, A extends AsEnum, R> = {
  [P in A["of"] as Variant<P>]: HasGeneric<P, "T"> extends true
    ? (value: GetT<G>) => R
    : P extends `${string}(U)`
    ? (value: GetU<G>) => R
    : () => R;
};

type DiscriminantFor<V, All> = Extract<All, `${V & string}(${string})`>;

export type GenericValue<V, T, U> = V extends `${string}(T)`
  ? T
  : V extends `${string}(U)`
  ? U
  : undefined;

export type CaseValue<G extends Generics, All> = G extends [
  infer V,
  infer T,
  infer U
]
  ? DiscriminantFor<V & string, All> extends infer D
    ? GenericValue<D, T, U>
    : never
  : G extends [infer V, infer T]
  ? DiscriminantFor<V & string, All> extends infer D
    ? GenericValue<D, T, never>
    : never
  : undefined;

export type Destructure<G extends Generics, All> = G extends [
  infer V,
  infer T,
  infer U
]
  ? DiscriminantFor<V & string, All> extends infer D
    ? [V, GenericValue<D, T, U>] //[V, GenericValue<D, T, U>]
    : never
  : G extends [infer V, infer T]
  ? DiscriminantFor<V & string, All> extends infer D
    ? [V, GenericValue<D, T, never>]
    : never
  : [G];

export declare class Case<G extends Generics, A extends AsEnum> {
  declare readonly variant: G extends unknown[] ? G[0] : G;
  declare readonly value: Destructure<G, A["of"]>;

  match<U>(matcher: Matcher<G, A, U>): U;
}

type EnumConstructor<K extends Discriminant> = {
  new (key: K): Case<K, { of: K }>;
  new <T>(key: K, value?: T): Case<
    K extends `${infer D}(${string})`
      ? [Discriminant<D>, T extends undefined ? never : T]
      : K,
    { of: K }
  >;
  new <T, U>(key: K, value?: T | U): Case<
    K extends `${infer D}(T)`
      ? [Discriminant<D>, T, never]
      : K extends `${infer D}(U)`
      ? [Discriminant<D>, never, U]
      : K,
    { of: K }
  >;
};

type HasGeneric<K extends Discriminant, G extends string> = true extends {
  [P in K]: K extends `${string}(${G})` ? true : false;
}[K]
  ? true
  : false;

type CaseInstance<G extends Generics, A extends AsEnum, I> = Case<G, A> &
  ThisType<Case<G, A> & I>;

type Class = abstract new (...args: any) => any;

type AnyEnumClass<P extends string, U> = abstract new (
  discriminant: P,
  value?: any
) => U;

export type StaticMethod<P extends string> = <
  This extends AnyEnumClass<P, U>, // abstract new (discriminant: P, value?: any) => U,
  U
>(
  this: This
) => U extends Case<any, any> ? U : InstanceType<This>;

export type EnumStatic<
  K extends Discriminant,
  P extends K,
  I extends Case<Generics, AsEnum>
> = HasGeneric<K, "U"> extends true
  ? P extends `${infer D}(U)`
    ? <U>(value: U) => CaseInstance<[Discriminant<D>, never, U], { of: K }, I>
    : P extends `${infer D}(T)`
    ? <T>(value: T) => CaseInstance<[Discriminant<D>, T, never], { of: K }, I>
    : StaticMethod<P>
  : HasGeneric<K, "T"> extends true
  ? HasGeneric<P, "T"> extends true
    ? <This extends abstract new (discriminant: P, value: T) => U, U, T>(
        this: This,
        value: T
      ) => U
    : StaticMethod<P>
  : HasGeneric<K, string> extends true
  ? never & `An Enum's generics must be either T or U, but you specified ${K}`
  : <This extends Class>(this: This) => InstanceType<This>;

type EnumClass<K extends Discriminant, C extends EnumConstructor<K>> = C & {
  [P in K as Variant<P>]: EnumStatic<K, P, InstanceType<C>>;
};

type EnumClassFor<K extends Discriminant> = EnumClass<K, EnumConstructor<K>>;

export function Enum<K extends string[]>(
  ...keys: K
): EnumClassFor<Discriminant<K[number]>> {
  class Enum {
    constructor(readonly variant: string, readonly value?: unknown) {}

    match<U>(matcher: Record<string, (value?: unknown) => U>): U {
      return matcher[this.variant](this.value);
    }
  }

  for (let discriminant of keys) {
    let { variant, generics } = verified(
      discriminant.match(/^(?<variant>[^(]*)(?<generics>\([^)]*\))?$/),
      is.Present
    ).groups as { variant: string; generics?: string };

    if (generics) {
      Object.defineProperty(Enum, variant, {
        enumerable: false,
        configurable: true,
        value: (value: unknown) => new Enum(variant, value),
      });
    } else {
      Object.defineProperty(Enum, variant, {
        enumerable: true,
        configurable: true,
        value: new Enum(variant),
      });
    }
  }

  return Enum as EnumClassFor<Discriminant<K[number]>>;
}
