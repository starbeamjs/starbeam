/* eslint-disable @typescript-eslint/no-explicit-any */

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
      if (Union.isMember(value)) {
        return new Union(value) as InstanceType<This>;
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

    #instance: S;

    constructor(value: S) {
      this.#instance = value;
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
