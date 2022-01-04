import { abstraction } from "./abstraction";
import { isPresent } from "./minimal";
import {
  as,
  CreatedContext,
  DescribedContext,
  FinalizedContext,
  VerifyContext,
} from "./verify-context";

export type DebugInformation = FinalizedContext | string;

function message(
  info: DebugInformation | undefined,
  defaultValue: DebugInformation
): string;
function message(info: DebugInformation): string;
function message(
  info: DebugInformation | undefined,
  defaultValue?: DebugInformation
): string {
  if (info === undefined) {
    return message(defaultValue as DebugInformation);
  } else if (typeof info === "string") {
    return info;
  } else {
    return info.message;
  }
}

export const DebugInformation = {
  message,
} as const;

/**
 * @strip.noop
 */
export function assert(
  condition: any,
  info: DebugInformation = "assertion error"
): asserts condition {
  if (condition === false) {
    debugger;
    throw Error(`Unexpected: ${DebugInformation.message(info)}`);
  }
}

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

  context<In>(verifier: Verifier<In, any>): CreatedContext<In> {
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

export function isVerifyContext(
  context: PartialVerifyContext
): context is VerifyContext {
  return typeof context.expected === "string";
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
      debugger;
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
  error: (value: In) => DebugInformation = () => "assertion failed"
): Out {
  if (predicate(value)) {
    return value;
  } else {
    return abstraction(() => {
      debugger;
      throw Error(DebugInformation.message(error(value)));
    });
  }
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
