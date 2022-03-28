import type { VerifierFunction } from "@starbeam/fundamental";
import { Abstraction } from "@starbeam/trace-internals";
import type { Discriminant, EnumInstanceN, Variant } from "@starbeam/utils";
import { Verifier, type VerifierUnion } from "./assert.js";
import { expected, type Relationship } from "./verify-context.js";

export type Primitive =
  | string
  | number
  | boolean
  | symbol
  | bigint
  | null
  | undefined;

export function isEqual<T extends Primitive | object>(
  value: T
): VerifierFunction<Primitive | object, T> {
  function verify(input: Primitive | object): input is T {
    return Object.is(input, value);
  }

  Verifier.implement<Primitive | object, T>(
    verify,
    expected(`value`)
      .toBe(String(value))
      .butGot((actual) => String(actual))
  );

  return verify;
}

export function matches<D extends Discriminant>(
  variant: Variant<D>
): <E extends EnumInstanceN<D>>(value: EnumInstanceN<D> | E) => value is E {
  function verify<E extends EnumInstanceN<D>>(
    value: EnumInstanceN<D> | E
  ): value is E {
    return value.matches(variant);
  }

  Verifier.implement<EnumInstanceN<D>, EnumInstanceN<D>>(
    verify,
    expected(`enum variant`)
      .to({ kind: "to", description: `match ${variant}` })
      .butGot((value) => value.variant)
  );

  return verify;
}

export function matchesAny<D extends Discriminant>(
  ...variants: Variant<D>[]
): <E extends EnumInstanceN<D>>(value: EnumInstanceN<D> | E) => value is E {
  function verify<E extends EnumInstanceN<D>>(
    value: EnumInstanceN<D> | E
  ): value is E {
    return value.matches("any", variants);
  }

  Verifier.implement<EnumInstanceN<D>, EnumInstanceN<D>>(
    verify,
    expected(`enum variant`)
      .to({ kind: "to", description: `match one of: ${variants.join(", ")}` })
      .butGot((value) => value.variant)
  );

  return verify;
}

export function isOneOf<V extends readonly VerifierFunction<any, any>[]>(
  ...args: V
): VerifierUnion<V[number]>;
export function isOneOf<V extends readonly VerifierFunction<any, any>[]>(
  ...args: [description: string, ...verifiers: V]
): VerifierUnion<V[number]>;
export function isOneOf<V extends readonly VerifierFunction<any, any>[]>(
  ...args: [description: string, ...verifiers: V]
): VerifierFunction<unknown, unknown> {
  const { relationship, verifiers } = normalizeOneOfArgs(args);

  function verify(input: unknown): input is unknown {
    return verifiers.some((v) => v(input));
  }

  Verifier.implement<unknown, unknown>(
    verify,
    expected(`value`)
      .to(relationship)
      .butGot((actual) => String(actual))
  );

  return verify;
}

interface NormalizedOneOfArgs<T, U extends T> {
  relationship: Relationship;
  verifiers: readonly VerifierFunction<T, U>[];
}

function normalizeOneOfArgs<T, U extends T>(
  args:
    | [description: string, ...verifiers: VerifierFunction<T, U>[]]
    | [VerifierFunction<T, U>[]]
): NormalizedOneOfArgs<T, U> {
  if (typeof args[0] === "string") {
    return {
      relationship: { kind: "to", description: args[0] },
      verifiers: args.slice(1) as VerifierFunction<T, U>[],
    };
  } else {
    const verifiers: VerifierFunction<T, U>[] = [];
    const expected: Relationship[] = [];

    for (let verifier of args) {
      if (Verifier.is(verifier)) {
        const { label, relationship } = Verifier.context(verifier).expected;

        verifiers.push(verifier as VerifierFunction<T, U>);

        if (relationship) {
          expected.push(relationship);
        } else {
          throw Error(
            `isOneOf must either take a description or be composed entirely of fully implemented verifiers with correct relationships. You passed a verifier without a relationship ${Abstraction.callerFrame(
              { extraFrames: 1 }
            )}`
          );
        }
      } else {
        if (typeof verifier === "function") {
          const name =
            (verifier as Function).name ||
            `a function ${Abstraction.callerFrame({ extraFrames: 1 })}`;
          throw Error(
            `isOneOf must either take a description or be composed entirely of fully implemented verifiers. You passed ${name}`
          );
        } else {
          throw Error(
            `isOneOf must either take a description or be composed entirely of fully implemented verifiers. You passed a non-function ${Abstraction.callerFrame(
              { extraFrames: 1 }
            )}`
          );
        }
      }
    }

    const toBes = expected
      .filter((e) => e.kind === "to be")
      .map((e) => e.description);
    const toHaves = expected
      .filter((e) => e.kind === "to have")
      .map((e) => e.description);

    const hasToBes = toBes.length > 0;
    const hasToHaves = toHaves.length > 0;

    if (hasToBes && !hasToHaves) {
      return {
        relationship: {
          kind: "to be",
          description: `one of: ${toBes.join(", ")}`,
        },
        verifiers,
      };
    } else if (!hasToBes && hasToHaves) {
      return {
        relationship: {
          kind: "to have",
          description: `one of: ${toHaves.join(", ")}`,
        },
        verifiers,
      };
    } else if (hasToBes && hasToHaves) {
      return {
        relationship: {
          kind: "to",
          description: `be one of: ${toBes.join(
            ", "
          )} *OR* to have one of ${toHaves.join(", ")}`,
        },
        verifiers,
      };
    } else {
      throw Error(
        `Expected isOneOf to take at least one verifier, but you passed none ${Abstraction.callerFrame(
          { extraFrames: 1 }
        )}`
      );
    }
  }
}
