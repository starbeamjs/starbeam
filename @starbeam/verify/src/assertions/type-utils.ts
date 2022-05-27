export type FixedArray<
  T,
  N extends number,
  SoFar extends unknown[] = []
> = SoFar["length"] extends N ? SoFar : FixedArray<T, N, [T, ...SoFar]>;

export type ReadonlyFixedArray<
  T,
  N extends number,
  SoFar extends readonly unknown[] = []
> = SoFar["length"] extends N
  ? SoFar
  : ReadonlyFixedArray<T, N, readonly [T, ...SoFar]>;
