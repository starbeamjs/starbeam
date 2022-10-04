/* eslint-disable @typescript-eslint/no-explicit-any */

import { DisplayStruct } from "./reporter/inspect.js";

/**
 * From https://stackoverflow.com/questions/55127004/how-to-transform-union-type-to-tuple-type
 *
 * This is a type that takes a union type and returns a tuple type with the same members. Its job is
 * to give us an exhaustiveness check when reifying a union type into a constant with all of the
 * union's members. Order doesn't matter, which is different from the context in the original
 * StackOverflow (which says to no-no-never-never do this).
 */

type Push<T extends any[], V> = [...T, V];

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
type LastOf<T> = UnionToIntersection<
  T extends any ? () => T : never
> extends () => infer R
  ? R
  : never;

export type EveryUnionMember<
  T,
  L = LastOf<T>,
  N = [T] extends [never] ? true : false
> = true extends N ? [] : Push<EveryUnionMember<Exclude<T, L>>, L>;

// interface Union<S extends string> {
//   readonly members: S[];
//   is(value: unknown): value is S;
//   assert(value: unknown): S;
// }

export interface UnionClass<S extends string> {
  readonly members: S[];
  readonly MEMBER: S;
  from<This extends UnionClass<S>>(
    this: This,
    value: S | InstanceType<This>
  ): InstanceType<This>;
  fromString<This extends UnionClass<S>>(
    this: This,
    value: unknown
  ): InstanceType<This>;
  isMember(value: S): value is S;
  format(): string;

  new (value: S): UnionInstance<S>;
}

export declare class UnionInstance<S extends string> {
  constructor(value: S);

  readonly MEMBER: S;
  readonly value: S;
  is(...values: S[]): boolean;
}

export type IntoUnion<U extends UnionInstance<string>> =
  U extends UnionInstance<infer S> ? S | U : never;

export function Union<S extends string>(...members: S[]): UnionClass<S> {
  return class Union {
    static readonly members: S[] = members;

    declare static MEMBER: S;

    static from<This extends UnionClass<S>>(
      this: This,
      value: S | InstanceType<This>
    ): InstanceType<This> {
      if (typeof value === "string") {
        return this.fromString(value);
      } else {
        return value;
      }
    }

    static fromString<This extends UnionClass<S>>(
      this: This,
      value: string
    ): InstanceType<This> {
      if (members.includes(value as S)) {
        return new this(value as S) as InstanceType<This>;
      } else {
        throw new Error(`Expected one of ${members.join(", ")}, got ${value}`);
      }
    }

    static isMember(this: void, value: unknown): value is S {
      return members.includes(value as S);
    }

    static format(): string {
      return members.join(" | ");
    }

    declare MEMBER: S;

    #instance: S;

    constructor(value: S) {
      this.#instance = value;
    }

    [Symbol.for("nodejs.util.inspect.custom")](): string {
      return `${this.constructor.name}(${this.#instance})`;
    }

    is(...values: S[]): boolean {
      return values.includes(this.#instance);
    }

    get value(): S {
      return this.#instance;
    }

    toString(): string {
      return this.#instance;
    }
  };
}

export function hasItems<T>(array: T[]): array is [T, ...T[]];
export function hasItems<T>(array: readonly T[]): array is readonly [T, ...T[]];
export function hasItems<T>(
  array: T[] | readonly T[]
): array is [T, ...T[]] | readonly [T, ...T[]];
export function hasItems<T>(
  array: T[] | readonly T[]
): array is [T, ...T[]] | readonly [T, ...T[]] {
  return array.length > 0;
}

export type IntoPresentArray<T> =
  | [T, ...T[]]
  | readonly [T, ...T[]]
  | PresentArray<T>;

export class PresentArray<T> extends Array<T> {
  static #hasItems<T>(array: readonly T[]): array is readonly [T, ...T[]];
  static #hasItems<T>(array: T[]): array is [T, ...T[]];
  static #hasItems<T>(
    array: T[] | readonly T[]
  ): array is [T, ...T[]] | readonly [T, ...T[]];
  static #hasItems<T>(array: T[]): array is [T, ...T[]] {
    return hasItems(array);
  }

  static from<T>(array: PresentArray<T> | T[] | readonly T[]): PresentArray<T> {
    if (array instanceof PresentArray) {
      return array;
    } else if (PresentArray.#hasItems(array)) {
      return new PresentArray(array);
    } else {
      return new PresentArray([]);
    }
  }

  readonly #array: readonly T[];

  private constructor(array: readonly T[]) {
    super(...array);
    this.#array = array;
  }

  andThen<U>(options: {
    present: (array: PresentArray<T> & [T, ...T[]]) => U;
    empty: () => U;
  }): U;
  andThen<U>(options: {
    present: (array: PresentArray<T> & [T, ...T[]]) => U;
    empty?: () => U;
  }): U | void;
  andThen<U>(fn: (array: PresentArray<T> & [T, ...T[]]) => U): U | void;
  andThen<U>(
    options:
      | {
          present: (array: PresentArray<T> & [T, ...T[]]) => U;
          empty?: () => U;
        }
      | ((array: PresentArray<T> & [T, ...T[]]) => U)
  ): U | void {
    const ifPresent = typeof options === "function" ? options : options.present;
    const ifEmpty =
      (typeof options === "function" ? undefined : options.empty) ??
      (() => void 0);

    if (this.#array.length === 0) {
      return ifEmpty();
    } else {
      return ifPresent(this as unknown as PresentArray<T> & [T, ...T[]]);
    }
  }

  orElse<U>(callback: () => U): U {
    return callback();
  }

  map<U>(
    mapper: (value: T, index: number, collection: PresentArray<T>) => U
  ): PresentArray<U> {
    return new PresentArray(
      this.#array.map((e, i) => mapper(e, i, this))
    ) as PresentArray<U>;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.#array[Symbol.iterator]();
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayStruct("PresentArray", { array: this.#array });
  }
}

export function map<T>(items: [T, ...T[]] | readonly [T, ...T[]]): T[] {
  return items.map((item) => item);
}
