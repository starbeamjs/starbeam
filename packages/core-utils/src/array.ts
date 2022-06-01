export function isArray<T>(
  value: unknown | T[] | readonly T[]
): value is T[] | readonly T[] {
  return Array.isArray(value);
}
