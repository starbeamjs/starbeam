export function last<T>(array: readonly T[]): T | undefined {
  if (array.length === 0) {
    return undefined;
  } else {
    return array[array.length - 1];
  }
}

export function isArray<T>(
  value: unknown | T[] | readonly T[]
): value is T[] | readonly T[] {
  return Array.isArray(value);
}
