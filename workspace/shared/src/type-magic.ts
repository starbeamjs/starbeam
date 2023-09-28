/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEmptyArray, TO_STRING } from "@starbeam/core-utils";

import { terminalWidth } from "./format.js";
import { DisplayStruct } from "./inspect.js";

if ("stackTraceLimit" in Error) {
  Error.stackTraceLimit = 1000;
}

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
  k: infer I,
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
  N = [T] extends [never] ? true : false,
> = true extends N ? [] : Push<EveryUnionMember<Exclude<T, L>>, L>;

export type Into<C extends UnionInstance<any>> = C["value"] | C;

interface UnionInstanceLike {
  readonly value: string;
}

export type IntoUnionInstance =
  | string
  | UnionInstanceLike
  | Iterable<UnionInstanceLike>;
export type AsString<C extends UnionInstance<any>> = C["value"];

type UnionClassMember<U extends UnionClass> = U extends UnionClass<infer S>
  ? S[number] | InstanceType<U>
  : never;

export type AnyUnionClass = UnionClass<readonly string[]>;

export interface UnionClass<S extends readonly string[] = any> {
  readonly members: S;

  getMember: (<S extends string[]>(
    value: string,
  ) => { type: "member"; value: S[number] }) &
    (<const This extends UnionClass<S>, S extends string[]>(
      value: UnionClassMember<This>,
    ) => MemberResult<This, S>);

  from: <const This extends UnionClass<S>>(
    this: This,
    value: UnionClassMember<This>,
  ) => InstanceType<This>;

  asString: <const This extends UnionClass<S>>(
    this: This,
    value: UnionClassMember<This>,
  ) => S[number];

  parse: <const This extends UnionClass<S>>(
    this: This,
    value: string,
  ) => InstanceType<This>;
  isMember: (this: void, value: string) => value is S[number];
  format: () => string;

  new (value: S[number]): UnionInstance<S>;

  toString: () => string;
}

export type Category<S extends readonly string[]> =
  S[number] extends infer Whole extends string
    ? Whole extends `${infer K}:${string}`
      ? K
      : Whole
    : never;

type Subtype<S extends readonly string[]> =
  S extends `${Category<S>}:${infer L}` ? L : never;

export declare class UnionInstance<S extends readonly string[]> {
  declare [TO_STRING]: true;

  constructor(value: S);

  readonly value: S[number];
  readonly category: Category<S>;

  toString(): string;
  eq(other: UnionInstance<S>): boolean;
  is<const T extends S[number]>(...values: T[]): this is { value: T };
  hasCategory<const T extends Category<S>>(...values: T[]): this is { type: T };

  as<const T extends S>(...values: T): T[number] | undefined;
  asCategory<const T extends Category<S>>(...values: T[]): T | undefined;
}

/**
 * For a list of things, this is the maximum inline width before the list is printed as a bulleted
 * list.
 */
const MAX_INLINE_LIST_WIDTH = 50;

type MemberResult<C extends UnionClass<S>, S extends readonly string[]> =
  | {
      type: "member";
      value: S[number];
    }
  | {
      type: "instance";
      value: InstanceType<C>;
    };

export function Union<const S extends readonly string[]>(
  ...members: S
): UnionClass<S> {
  function assertMember(this: void, value: string): asserts value is S[number] {
    if (!members.includes(value)) {
      throw new Error(`Expected one of ${members.join(", ")}, got ${value}`);
    }
  }

  return class Union {
    static readonly members: S = members;

    declare static Into: S;

    static getMember(value: S[number]): { type: "member"; value: S[number] };
    static getMember(value: string): { type: "member"; value: S[number] };
    static getMember<const This extends UnionClass<S>>(
      value: UnionClassMember<This>,
    ): MemberResult<This, S>;
    static getMember<const This extends UnionClass<S>>(
      value: UnionClassMember<This>,
    ): MemberResult<This, S> {
      if (typeof value === "string") {
        assertMember(value);
        return { type: "member", value: value as S[number] };
      } else {
        return { type: "instance", value: value as InstanceType<This> };
      }
    }

    static from<const This extends UnionClass<S>>(
      this: This,
      value: UnionClassMember<This>,
    ): InstanceType<This> {
      return typeof value === "string"
        ? this.parse(value)
        : (value as InstanceType<This>);
    }

    static asString<This extends UnionClass<S>>(
      this: This,
      value: UnionClassMember<This>,
    ): S[number] {
      return this.from(value).value;
    }

    static parse<const This extends UnionClass<S>>(
      this: This,
      value: string,
    ): InstanceType<This> {
      const member = this.getMember(value);

      return new this(member.value) as InstanceType<This>;
    }

    static isMember(this: void, value: string): value is S[number] {
      return members.includes(value);
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

    #instance: S[number];

    constructor(value: S[number]) {
      this.#instance = value;
    }

    [Symbol.for("nodejs.util.inspect.custom")](): string {
      return `${this.constructor.name}(${this.#instance})`;
    }

    eq(other: UnionInstance<S>): boolean {
      return this.#instance === other.value;
    }

    is<T extends S[number]>(...values: T[]): boolean {
      return values.includes(this.#instance as T);
    }

    as<const T extends S>(...values: T): T[number] | undefined {
      if (values.includes(this.#instance)) {
        return this.#instance as T[number];
      }
    }

    asCategory<const T extends Category<S>>(...values: T[]): T | undefined {
      if ((values as Category<S>[]).includes(this.category)) {
        return this.category as T;
      }
    }

    hasCategory(...values: Category<S>[]): boolean {
      if (this.#instance.includes(":")) {
        return values.some((v) => this.#instance.startsWith(`${v}:`));
      } else {
        return values.includes(this.#instance as Category<S>);
      }
    }

    get value(): S[number] {
      return this.#instance;
    }

    get category(): Category<S> {
      if (this.#instance.includes(":")) {
        const [type] = this.#instance.split(":") as [Category<S>, Subtype<S>];
        return type;
      } else {
        return this.#instance as Category<S>;
      }
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
    array: PresentArray<T> | readonly T[] | T[],
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
    then: (array: PresentArray<T> & [T, ...T[]]) => U,
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
      | ((array: PresentArray<T> & [T, ...T[]]) => U),
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
    mapper: (value: T, index: number, collection: PresentArray<T>) => U,
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

export type IntoResult<T, E = unknown> = T | Result<T, E>;
export type LiftResult<I extends IntoResult<any, any>> = I extends IntoResult<
  infer T,
  infer E
>
  ? Result<T, E>
  : never;

export type ResultRecord<E = unknown> = Record<string, IntoResult<unknown, E>>;

export type OkRecord<T extends ResultRecord> = {
  [P in keyof T]: T[P] extends Result<infer U, any> ? U : never;
};

export type RecordError<T extends ResultRecord> = {
  [P in keyof T]: T[P] extends Result<any, infer E> ? E : never;
}[keyof T];

export interface TakeFn<E> {
  <const T>(value: IntoResult<T, E>): T;
  err: <T = void>(reason: E) => Result<T, E>;
}

class JumpTake<E> extends Error {
  constructor(readonly inner: E) {
    super();
  }
}

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
          return Result.err<E, T[]>(result.reason);
      }
    }

    return Result.ok(list);
  }

  static do<const T, const E>(
    callback: (take: TakeFn<E>) => IntoResult<T, E>,
  ): Result<T, E> {
    return Result.ok<void, E>(undefined).#mapp(callback) as Result<T, E>;
  }

  static map<T, U, E>(
    items: T[],
    mapper: (value: T) => IntoResult<U, E>,
  ): Result<U[], E> {
    return Result.list(items.map(mapper));
  }

  static flatMap<T, U, E>(
    items: T[],
    mapper: (value: T) => IntoResult<U, E>[],
  ): Result<U[], E> {
    return Result.list(items.flatMap(mapper));
  }

  static record<T extends ResultRecord>(
    items: T,
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

  static from<const T, const E>(value: IntoResult<T, E>): Result<T, E> {
    if (value && value instanceof Result) {
      return value;
    } else {
      return Result.ok(value);
    }
  }

  static ok<T, E>(value: T): Result<T, E> {
    return new Result({ status: "ok", value });
  }

  static err<E, T = never>(reason: E): Result<T, E> {
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

  /**
   * Extract the Ok value from a Result, treating an Err as a fatal error.
   *
   * The error is passed to the `error` callback, which is expected to return
   * a `never` value (e.g. `process.exit`).
   */
  mapWithFatalError(error: (reason: E) => never): T {
    switch (this.#variant.status) {
      case "ok":
        return this.#variant.value;
      case "err":
        return error(this.#variant.reason);
    }
  }

  #mapp<const I extends IntoResult<any, E>, const E>(
    callback: (take: TakeFn<E>) => I,
  ): LiftResult<I> {
    try {
      const take: TakeFn<E> = <T>(value: IntoResult<T, E>): T => {
        const result = Result.from(value);
        const variant = result.#variant;

        switch (variant.status) {
          case "ok":
            return variant.value;
          case "err":
            throw new JumpTake(variant.reason);
        }
      };

      take.err = (reason) => {
        return Result.err(reason);
      };

      return Result.from(callback(take)) as LiftResult<I>;
    } catch (e) {
      if (e && e instanceof JumpTake) {
        return Result.err(e.inner) as LiftResult<I>;
      }

      throw e;
    }
  }

  map<const T2, const E2 = E>(
    callback: (value: T) => IntoResult<T2, E2>,
  ): Result<T2, E | E2> {
    switch (this.#variant.status) {
      case "ok":
        return Result.ok(callback(this.#variant.value)) as Result<T2, E | E2>;
      case "err":
        return Result.err(this.#variant.reason) as Result<T2, E | E2>;
    }
  }

  mapErr<T2, E2>(callback: (error: E) => Result<T2, E2>): Result<T2, E2>;
  mapErr<E2>(callback: (error: E) => E2): Result<T, E2>;

  mapErr(callback: (error: E) => IntoResult<any>): Result<any> {
    return this.match({
      ifOk: () => this,
      ifError: (reason) => Result.from(callback(reason)),
    });
  }

  match<
    const IfOk extends IntoResult<unknown, E>,
    const IfErr extends IntoResult<T, unknown>,
  >(options: {
    ifOk: (value: T) => IfOk;
    ifError: (value: E) => IfErr;
  }): LiftResult<IfOk> | LiftResult<IfErr> {
    if (this.#variant.status === "ok") {
      return Result.from(options.ifOk(this.#variant.value)) as LiftResult<IfOk>;
    } else {
      const result = options.ifError(this.#variant.reason);

      if (result instanceof Result) {
        return result as LiftResult<IfErr>;
      } else {
        return Result.err(result) as LiftResult<IfErr>;
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
