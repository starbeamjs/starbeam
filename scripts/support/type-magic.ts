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
