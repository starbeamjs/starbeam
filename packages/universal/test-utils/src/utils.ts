// Avoid needing an extra import
export const UNINITIALIZED = Symbol.for("@starbeam/uninitialized");
export type UNINITIALIZED = typeof UNINITIALIZED;

export function assert(
  condition: unknown,
  message?: string
): asserts condition {
  if (!condition) {
    throw new Error(message ?? "Assertion failed");
  }
}
