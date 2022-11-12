/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEmptyArray, TO_STRING } from "@starbeam/core-utils";

import { terminalWidth } from "./format.js";
import { DisplayStruct } from "./reporter/inspect.js";

Error.stackTraceLimit = 1000;

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

export type Into<C extends UnionInstance<string>> = C["value"] | C;
export type IntoUnionInstance = string | { readonly value: string };
export type AsString<C extends UnionInstance<string>> = C["value"];

export interface UnionClass<S extends string> {
  readonly members: S[];
  from: <This extends UnionClass<S>>(
    this: This,
    value: S | InstanceType<This>
  ) => InstanceType<This>;

  asString: <This extends UnionClass<S>>(
    this: This,
    value: S | InstanceType<This>
  ) => S;

  fromString: <This extends UnionClass<S>>(
    this: This,
    value: string
  ) => InstanceType<This>;
  isMember: (value: unknown) => value is S;
  format: () => string;

  new (value: S): UnionInstance<S>;

  toString: () => string;
}

type Kind<S extends string> = S extends `${infer K}:${string}` ? K : never;
type Subtype<
  S extends string,
  Kind extends string = string
> = S extends `${Kind}:${infer K}` ? K : never;

export declare class UnionInstance<S extends string> {
  declare [TO_STRING]: true;

  constructor(value: S);

  readonly value: S;
  readonly subtype: Subtype<S>;

  toString(): string;
  is(...values: S[]): boolean;
  isType<K extends Kind<S>>(...values: K[]): this is { subtype: Subtype<S, K> };
}

/**
 * For a list of things, this is the maximum inline width before the list is printed as a bulleted
 * list.
 */
const MAX_INLINE_LIST_WIDTH = 50;

export function Union<S extends string>(...members: S[]): UnionClass<S> {
  return class Union {
    static readonly members: S[] = members;

    declare static Into: S;

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

    static asString<This extends UnionClass<S>>(
      this: This,
      value: S | InstanceType<This>
    ): S {
      return this.from(value).value;
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
      const oneline = `  ${members.join(" | ")}`;

      if (oneline.length > Math.min(terminalWidth(), MAX_INLINE_LIST_WIDTH)) {
        return members.map((member) => `  - ${member}`).join("\n");
      } else {
        return oneline;
      }
    }

    declare [TO_STRING]: true;
    declare Into: S;

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

    isType(...values: Kind<S>[]): boolean {
      return values.some((v) => this.#instance.startsWith(`${v}:`));
    }

    get value(): S {
      return this.#instance;
    }

    get subtype(): Subtype<S> {
      const [, subtype] = this.#instance.split(":");
      return subtype as Subtype<S>;
    }

    toString(): string {
      return this.#instance;
    }
  };
}

export type IntoPresentArray<T> =
  | [T, ...T[]]
  | readonly [T, ...T[]]
  | PresentArray<T>;

export class PresentArray<T> extends Array<T> {
  static override from<T>(
    array: PresentArray<T> | readonly T[] | T[]
  ): PresentArray<T> {
    if (array instanceof PresentArray) {
      return array;
    } else {
      return new PresentArray([...array]);
    }
  }

  static fromIterable<T>(array: Iterable<T>): PresentArray<T> {
    return new PresentArray([...array]);
  }

  readonly #array: readonly T[];

  private constructor(array: readonly T[]) {
    super(...array);
    this.#array = array;
  }

  ifPresent<U>(
    then: (array: PresentArray<T> & [T, ...T[]]) => U
  ): U | undefined {
    return this.andThen({
      present: then,
    });
  }

  andThen<U>(options: {
    present: (array: PresentArray<T> & [T, ...T[]]) => U;
    empty: () => U;
  }): U;
  andThen<U>(options: {
    present: (array: PresentArray<T> & [T, ...T[]]) => U | void;
    empty?: () => U;
  }): U | undefined;
  andThen<U>(
    options:
      | {
          present: (array: PresentArray<T> & [T, ...T[]]) => U;
          empty?: () => U;
        }
      | ((array: PresentArray<T> & [T, ...T[]]) => U)
  ): U | undefined {
    const ifPresent = typeof options === "function" ? options : options.present;
    const ifEmpty =
      (typeof options === "function" ? undefined : options.empty) ??
      (() => undefined);

    if (isEmptyArray(this)) {
      return ifEmpty();
    } else {
      return ifPresent(this as unknown as PresentArray<T> & [T, ...T[]]);
    }
  }

  orElse<U>(callback: () => U): U {
    return callback();
  }

  override map<U>(
    mapper: (value: T, index: number, collection: PresentArray<T>) => U
  ): PresentArray<U> {
    return new PresentArray(this.#array.map((e, i) => mapper(e, i, this)));
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

export type IntoResult<T, E = unknown> = T | Result<T, E>;

export type ResultRecord<E = unknown> = Record<string, IntoResult<unknown, E>>;

export type OkRecord<T extends ResultRecord> = {
  [P in keyof T]: T[P] extends Result<infer U, any> ? U : never;
};

export type RecordError<T extends ResultRecord> = {
  [P in keyof T]: T[P] extends Result<any, infer E> ? E : never;
}[keyof T];

export class Result<T, E = unknown> {
  static list<T, E>(items: IntoResult<T, E>[]): Result<T[], E> {
    const list: T[] = [];

    for (const item of items) {
      const result = Result.from<T, E>(item).get();

      switch (result.status) {
        case "ok":
          list.push(result.value);
          break;
        case "err":
          return Result.err<T[], E>(result.reason);
      }
    }

    return Result.ok(list);
  }

  static map<T, U, E>(
    items: T[],
    mapper: (value: T) => IntoResult<U, E>
  ): Result<U[], E> {
    return Result.list(items.map(mapper));
  }

  static flatMap<T, U, E>(
    items: T[],
    mapper: (value: T) => IntoResult<U, E>[]
  ): Result<U[], E> {
    return Result.list(items.flatMap(mapper));
  }

  static record<T extends ResultRecord>(
    items: T
  ): Result<OkRecord<T>, RecordError<T>> {
    const result: Record<string, unknown> = {};

    for (const key in items) {
      const value = Result.from(items[key]).get();

      switch (value.status) {
        case "ok":
          result[key] = value.value;
          break;
        case "err":
          return Result.err(value.reason as RecordError<T>);
      }
    }

    return Result.ok(result as OkRecord<T>);
  }

  static from<T, E>(value: IntoResult<T, E>): Result<T, E> {
    if (value && value instanceof Result) {
      return value;
    } else {
      return Result.ok(value);
    }
  }

  static ok<T, E>(value: T): Result<T, E> {
    return new Result({ status: "ok", value });
  }

  static err<T, E>(reason: E): Result<T, E> {
    return new Result({ status: "err", reason });
  }

  readonly #variant: OkResult<T> | ErrResult<E>;

  private constructor(variant: OkResult<T> | ErrResult<E>) {
    this.#variant = variant;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    if (this.#variant.status === "ok") {
      return DisplayStruct("ok", {
        value: this.#variant.value,
      });
    } else {
      return DisplayStruct("err", {
        reason: this.#variant.reason,
      });
    }
  }

  get(): OkResult<T> | ErrResult<E> {
    return this.#variant;
  }

  getValue(): T | E {
    switch (this.#variant.status) {
      case "ok":
        return this.#variant.value;
      case "err":
        return this.#variant.reason;
    }
  }

  map<T2, E2>(callback: (value: T) => Result<T2, E2>): Result<T2, E2>;
  map<T2>(callback: (value: T) => T2): Result<T2, E>;
  map(callback: (value: T) => IntoResult<unknown>): Result<unknown> {
    return this.match({
      ifOk: (value) => callback(value),
      ifError: (reason) => reason,
    });
  }

  mapErr<T2, E2>(callback: (error: E) => Result<T2, E2>): Result<T2, E2>;
  mapErr<E2>(callback: (error: E) => E2): Result<T, E2>;

  mapErr(callback: (error: E) => IntoResult<any>): Result<any> {
    return this.match({
      ifOk: () => this,
      ifError: (reason) => Result.from(callback(reason)),
    });
  }

  match<T2, E2>(options: {
    ifOk: (value: T) => T2 | Result<T2, E>;
    ifError: (value: E) => E2 | Result<T, E2>;
  }): Result<T | T2, E | E2> {
    if (this.#variant.status === "ok") {
      return Result.from(options.ifOk(this.#variant.value));
    } else {
      const result = options.ifError(this.#variant.reason);

      if (result instanceof Result) {
        return result;
      } else {
        return Result.err(result);
      }
    }
  }
}

export interface OkResult<T> {
  readonly status: "ok";
  readonly value: T;
}

export interface ErrResult<E> {
  readonly status: "err";
  readonly reason: E;
}

export function fatal(_: never): never {
  throw Error("Unreachable");
}
