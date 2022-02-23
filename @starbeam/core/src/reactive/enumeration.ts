import type { InferReturn } from "@starbeam/fundamental";
import { verified } from "@starbeam/verify";
import { is } from "../strippable/minimal.js";

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

export interface EnumInstance0<D extends Discriminant> {
  // readonly [VARIANT]: Variant<I & string>;
  // readonly [VALUE]: void;

  match<Out>(matcher: { [P in D]: () => Out }): Out;
}

export interface EnumInstance1<D extends Discriminant, T> {
  // readonly [VARIANT]: Variant<I & string>;
  // readonly [VALUE]: void;

  match<Out>(matcher: {
    [P in D as Variant<P>]: true extends HasGeneric<P, "T">
      ? (value: T) => Out
      : () => Out;
  }): Out;
}

export interface EnumInstance2<D extends Discriminant, T, U> {
  // readonly [VARIANT]: Variant<I & string>;
  // readonly [VALUE]: void;

  match<Out>(matcher: {
    [P in D as Variant<P>]: true extends HasGeneric<P, "T">
      ? (value: T) => Out
      : true extends HasGeneric<P, "U">
      ? (value: U) => Out
      : () => Out;
  }): Out;
}

type EnumClass0<K extends string> = (abstract new (
  discriminant: K
) => EnumInstance0<K>) & {
  [P in K]: <This extends abstract new (discriminant: P) => Instance, Instance>(
    this: This
  ) => Instance;
};

type EnumClass1<K extends string> = {
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

type EnumClass2<K extends string> = {
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

type HasGeneric<K extends string, G extends string> = {
  [P in K]: P extends `${string}(${G})` ? true : false;
}[K];

type EnumClass<K extends string> = true extends HasGeneric<K, "U">
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

    match<U>(matcher: Record<string, (value?: unknown) => U>): U {
      return matcher[this.#variant](this.#value);
    }
  }

  for (let discriminant of keys) {
    let { variant } = verified(
      discriminant.match(/^(?<variant>[^(]*)(?<generics>\([^)]*\))?$/),
      is.Present
    ).groups as { variant: string; generics?: string };

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
