import { assert } from "@starbeam/fundamental";
import type { InferReturn } from "./any.js";

/**
 * The Discriminant is the low-level, internal representation of the instance of
 * an enum, and contains the generic (i.e. `Some(T)`).
 */
export type Discriminant = string;

export type Variant<D extends Discriminant> = D extends `${infer V}(${string})`
  ? V
  : D;

export type Matcher<
  D extends Discriminant,
  T,
  U,
  Out
> = D extends `${string}(T)`
  ? <V extends Out>(value: T) => V
  : D extends `${string}(U)`
  ? <V extends Out>(value: U) => V
  : <V extends Out>() => V;

export type Matchers<D extends Discriminant, Out, T = never, U = never> = {
  [P in D]: Matcher<P, T, U, Out>;
};

export interface EnumInstanceN<D extends Discriminant> {
  readonly variant: Variant<D>;

  matches(rule: "any", variants: readonly Variant<D>[]): boolean;
  matches(variant: Variant<D>): boolean;
}

export interface EnumInstance0<D extends Discriminant>
  extends EnumInstanceN<D> {
  match<Out>(matcher: MatcherFor0<D, Out>): Out;
}

type MatcherFor0<D extends Discriminant, Out> = {
  [P in D]: () => Out;
};

export interface EnumInstance1<D extends Discriminant, T>
  extends EnumInstanceN<D> {
  match<Out>(matcher: MatcherFor1<D, T, Out>): Out;
}

type MatcherFor1<D extends Discriminant, T, Out> = {
  [P in D as Variant<P>]: true extends HasGeneric<P, "T">
    ? (value: T) => Out
    : () => Out;
};

export interface EnumInstance2<D extends Discriminant, T, U>
  extends EnumInstanceN<D> {
  match<Out>(matcher: MatcherFor2<D, T, U, Out>): Out;
}

type MatcherFor2<D extends Discriminant, T, U, Out> = {
  [P in D as Variant<P>]: true extends HasGeneric<P, "T">
    ? (value: T) => Out
    : true extends HasGeneric<P, "U">
    ? (value: U) => Out
    : () => Out;
};

export type Enumeration<D extends Discriminant = Discriminant> =
  | EnumInstance0<D>
  | EnumInstance1<D, any>
  | EnumInstance2<D, any, any>;

export type MatcherFor<E extends Enumeration, Out> = E extends EnumInstance0<
  infer D
>
  ? MatcherFor0<D, Out>
  : E extends EnumInstance1<infer D, infer T>
  ? MatcherFor1<D, T, Out>
  : E extends EnumInstance2<infer D, infer T, infer U>
  ? MatcherFor2<D, T, U, Out>
  : never;

export type EnumClass0<K extends string> = (abstract new (
  discriminant: K
) => EnumInstance0<K>) & {
  [P in K]: <This extends abstract new (discriminant: P) => Instance, Instance>(
    this: This
  ) => Instance;
};

export type EnumClass1<K extends string> = {
  new <T>(...args: K extends `${string}(T)` ? [K, T] : [K]): EnumInstance1<
    K,
    T
  >;
} & {
  [P in K as Variant<P>]: P extends `${string}(T)`
    ? <
        This extends abstract new (discriminant: P, value: T) => Instance,
        Instance,
        T
      >(
        this: This,
        value: T
      ) => Instance
    : <This extends abstract new (discriminant: P) => Instance, Instance>(
        this: This
      ) => Instance;
};

export type EnumClass2<K extends string> = {
  new <T, U>(
    ...args: K extends `${string}(T)`
      ? [K, T, never]
      : K extends `${string}(U)`
      ? [K, never, U]
      : [K]
  ): EnumInstance2<K, T, U>;
} & {
  [P in K as Variant<P>]: P extends `${string}(T)`
    ? <
        This extends abstract new (discriminant: P, t: T, u: never) => Instance,
        Instance,
        T
      >(
        this: This,
        value: T
      ) => Instance
    : P extends `${string}(U)`
    ? <
        This extends abstract new (
          discriminant: P,
          t: never,
          value: U
        ) => Instance,
        Instance,
        U
      >(
        this: This,
        value: U
      ) => Instance
    : <This extends abstract new (discriminant: P) => Instance, Instance>(
        this: This
      ) => Instance;
};

export type HasGeneric<K extends string, G extends string> = {
  [P in K]: P extends `${string}(${G})` ? true : false;
}[K];

export type EnumClass<K extends string> = true extends HasGeneric<K, "U">
  ? EnumClass2<K>
  : true extends HasGeneric<K, "T">
  ? EnumClass1<K>
  : EnumClass0<K>;

export function Enum<K extends string[]>(...keys: K): EnumClass<K[number]> {
  class Enum {
    readonly #variant: string;
    readonly #value?: unknown;

    constructor(variant: string, value: unknown) {
      this.#variant = variant;
      this.#value = value;
    }

    get variant(): string {
      return this.#variant;
    }

    match<U>(matcher: Record<string, (value?: unknown) => U>): U {
      return matcher[this.#variant](this.#value);
    }

    matches(variant: string): boolean;
    matches(rule: "any", variants: [string, ...string[]]): boolean;
    matches(
      ...args:
        | [rule: "any", variants: [string, ...string[]]]
        | [variant: string]
    ): boolean {
      const [rule, variants] = args;

      if (rule === "any" && Array.isArray(variants)) {
        return variants.some((v) => this.matches(v));
      } else {
        return rule === this.#variant;
      }
    }
  }

  for (let discriminant of keys) {
    const match = discriminant.match(
      /^(?<variant>[^(]*)(?<generics>\([^)]*\))?$/
    );

    assert(match !== null);

    let { variant } = match.groups as { variant: string; generics?: string };

    Object.defineProperty(Enum, variant, {
      enumerable: false,
      configurable: true,
      value(value: unknown) {
        return new this(variant, value);
      },
    });
  }

  return Enum as InferReturn;
}
