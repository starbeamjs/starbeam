export function isPresentString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export const TO_STRING = Symbol("TO_STRING");
export type TO_STRING = typeof TO_STRING;

type HasToString = string | number | boolean | { [TO_STRING]: true };

/**
 * A template literal tag that combines multiple strings into a single string,
 * as long as all of the strings have a `toString()` implementation.
 */
export function stringify(
  literal: TemplateStringsArray,
  ...dynamics: HasToString[]
): string {
  let out = "";

  for (let i = 0; i < literal.length; i++) {
    out += literal[i];

    if (i < dynamics.length) {
      out += String(dynamics[i]);
    }
  }

  return out;
}

export function asIntIndex(property: string): number | null {
  const index = Number(property);
  return Number.isInteger(index) ? index : null;
}
