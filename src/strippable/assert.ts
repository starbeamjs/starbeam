import { isPresent } from "../utils/presence";
import { abstraction } from "./abstraction";
import { DebugInformation } from "./core";
import {
  as,
  CreatedContext,
  DescribedContext,
  VerifyContext,
} from "./verify-context";

/**
 * @strip.value value
 */
export function present<T>(
  value: T | null | undefined,
  info?: DebugInformation
): T {
  if (value === null) {
    throw Error(DebugInformation.message(info, "unexpected null"));
  } else if (value === undefined) {
    throw Error(DebugInformation.message(info, "unexpected undefined"));
  } else {
    return value;
  }
}

export interface Verifier<In, Out extends In> {
  (value: In): value is Out;
}

const VERIFIER = new WeakMap<
  Verifier<unknown, unknown>,
  CreatedContext<unknown>
>();

export const Verifier = {
  implement<In, Out extends In>(
    verifier: Verifier<In, Out>,
    message: CreatedContext<In>
  ): void {
    VERIFIER.set(
      verifier as Verifier<unknown, unknown>,
      message as CreatedContext<unknown>
    );
  },

  context<In>(verifier: Verifier<In, In>): CreatedContext<In> {
    return verified(
      VERIFIER.get(verifier as Verifier<unknown, unknown>),
      isPresent
    );
  },

  assertion<In>(
    verifier: Verifier<In, In>,
    updates: IntoBuildContext | undefined,
    value: In
  ): DebugInformation {
    let created =
      VERIFIER.get(verifier as Verifier<unknown, unknown>) ?? as("value");

    return created.update(IntoBuildContext.create(updates)).finalize(value)
      .message;
  },
};

// const DEFAULT_VERIFIER_MESSAGE: VerifierMessage<unknown> = {
//   context: as("value"),
//   message: ({ expected, relationship }) =>
//     relationship
//       ? `Expected ${input} to be ${description}`
//       : `${input} verification failed`,
// };

export interface PartialVerifier<In, Out extends In> {
  (value: In): value is Out;
  default?: VerifyContext;
  message?: (context: VerifyContext, value: In) => DebugInformation;
}

export type NormalizeContext<In> = (
  value: In,
  context: VerifyContext
) => VerifyContext;

export type IntoBuildContext = CreatedContext | PartialVerifyContext;

function isCreatedContext(
  context?: IntoBuildContext
): context is CreatedContext {
  return context !== undefined && context instanceof CreatedContext;
}

const IntoBuildContext = {
  create(into: IntoBuildContext | undefined): CreatedContext {
    if (isCreatedContext(into)) {
      return into;
    } else if (into === undefined) {
      return CreatedContext.DEFAULT;
    } else {
      return DescribedContext.of(VerifyContext.from(into)).assert();
    }
  },
} as const;

export interface CompleteContext extends VerifyContext {
  readonly actual: string | null;
}

export interface PartialVerifyContext {
  expected?: string;
  relationship?: {
    kind: "to be" | "to have";
    description: string;
  };
}

export interface MutableVerifyContext {
  expected: string;
  relationship?: {
    kind: "to be" | "to have";
    description: string;
  };
}

/**
 * @strip.noop
 */
export function verify<In, Out extends In>(
  value: In,
  verifier: Verifier<In, Out>,
  context?: IntoBuildContext
): asserts value is Out {
  if (!verifier(value)) {
    let message = Verifier.assertion(
      verifier,
      IntoBuildContext.create(context).finalize(value).context,
      value
    );

    abstraction(() => {
      console.assert(false, DebugInformation.message(message));
      throw Error(DebugInformation.message(message));
    });
  }
}

/**
 * @strip.value value
 */
export function verified<Out extends In, In = unknown>(
  value: In,
  predicate: (value: In) => value is Out,
  context?: IntoBuildContext
): Out {
  verify(value, predicate, context);
  return value;
}

export function exhaustive(_value: never, type?: string): never {
  return abstraction(() => {
    if (type) {
      throw Error(`unexpected types left in ${type}`);
    } else {
      throw Error(`unexpected types left`);
    }
  });
}
