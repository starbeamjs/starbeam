import { verified } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyKey = keyof any;

type Generics =
  | [variant: AnyKey, value: unknown]
  | [variant: AnyKey, t: unknown, u: unknown]
  | AnyKey;

type AsEnum = { of: AnyKey };

type GetMatcherT<G extends Generics, R> = G extends [AnyKey, infer T, unknown]
  ? (value: T) => R
  : G extends [AnyKey, infer T]
  ? (value: T) => R
  : (value?: any) => R;

type GetMatcherU<G extends Generics, R> = G extends [AnyKey, unknown, infer U]
  ? (value: U) => R
  : (value?: any) => R;

export type MatcherValue<G extends Generics, K extends AnyKey, R> = HasGeneric<
  K,
  "U"
> extends true
  ? GetMatcherU<G, R>
  : [K] extends [`${string}(${string})`]
  ? GetMatcherT<G, R>
  : () => R;

export type MatcherFunction<
  G extends Generics,
  K extends AnyKey,
  R
> = MatcherValue<G, K, R>;

type GetT<G extends Generics> = G extends [any, infer T, any]
  ? T
  : G extends [any, infer T]
  ? T
  : never;

type GetU<G extends Generics> = G extends [any, any, infer U] ? U : never;

type Matcher<G extends Generics, A extends AsEnum, R> = {
  [P in A["of"] as Discriminant<P>]: HasGeneric<P, "T"> extends true
    ? (value: GetT<G>) => R
    : P extends `${string}(U)`
    ? (value: GetU<G>) => R
    : () => R;
};

type DiscriminantFor<V, All> = Extract<All, `${V & string}(${string})`>;

type GetGeneric<V> = V extends `${string}(${infer G})` ? G : never;

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

// type GenericVariant<G extends Generics> =

// type ValueOf<G extends Generics> =

export declare class Case<G extends Generics, A extends AsEnum> {
  declare readonly variant: G extends unknown[] ? G[0] : G;
  declare readonly value: Destructure<G, A["of"]>;
  // declare readonly value: () => { info: CaseValue<G, A["of"]> };
  // declare readonly discriminant: Destructure<G, A["of"]>["discriminant"];

  match<U>(matcher: Matcher<G, A, U>): U;
}

type EnumClass<K extends AnyKey> = {
  new (key: K): Case<Discriminant<K>, { of: K }>;
  new <T>(key: Extract<K, `${string}(${string})`>, value?: T): Case<
    K extends `${infer D}(${string})` ? [D, T] : K,
    { of: K }
  >;
  new <T, U>(key: K, value?: T | U): Case<
    K extends `${infer D}(T)`
      ? [D, T, never]
      : K extends `${infer D}(U)`
      ? [D, never, U]
      : K,
    { of: K }
  >;
};

type Discriminant<K extends AnyKey> = K extends `${infer D}(${string})` ? D : K;

type HasGeneric<K extends AnyKey, G extends string> = true extends {
  [P in K]: K extends `${string}(${G})` ? true : false;
}[K]
  ? true
  : false;

export type EnumStatic<K extends AnyKey, P extends K> = HasGeneric<
  K,
  "U"
> extends true
  ? P extends `${infer D}(U)`
    ? <U>(value: U) => Case<[D, never, U], { of: K }>
    : P extends `${infer D}(T)`
    ? <T>(value: T) => Case<[D, T, never], { of: K }>
    : Case<P, { of: K }>
  : P extends `${infer D}(T)`
  ? <T>(value: T) => Case<[D, T], { of: K }>
  : Case<P, { of: K }>;

// K extends `${infer D}(U)`
//   ? <U>(value: U) => Case<[D, never, U], { of: K }>
//   : P extends `${infer D}(T)`
//   ? <T>(value: T) => Case<[D, T, never], { of: K }>
//   : Case<P, { of: K }>
// : P extends `${infer D}(T)`
// ? <T>(value: T) => Case<[D, T], { of: K }> & { value: T }
// : Case<Discriminant<P>, { of: K }>;

type EnumClassFor<K extends AnyKey> = EnumClass<K> & {
  [P in K as Discriminant<P>]: EnumStatic<K, P>;
};

export function Enum<K extends string[]>(...keys: K): EnumClassFor<K[number]> {
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
        value: (value: any) => new Enum(variant, value),
      });
    } else {
      Object.defineProperty(Enum, variant, {
        enumerable: true,
        configurable: true,
        value: new Enum(variant),
      });
    }
  }

  return Enum as any;
}
