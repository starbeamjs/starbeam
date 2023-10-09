/**
 * TypeScript (and ESLint) sometimes believe that a particular switch or if/else
 * sequence is not exhaustive, and wants a pointless `default` or `else` clause.
 * This function closes that gap by converting a `never` value into a never
 * control flow (which shouldn't be necessary in the first place, but here we
 * are).
 */
export function exhaustive(_value: never, type = "type"): never {
  if (import.meta.env.DEV) {
    throw new Error(
      `Expected to exhaust ${type}: This error should have been caught by the type checker (and maybe was!)`,
    );
  }

  return _value;
}
