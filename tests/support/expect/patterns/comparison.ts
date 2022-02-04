import { UnsafeAny } from "starbeam";
import {
  AnyPatternDSL,
  Described,
  Pattern,
  PatternImpl,
  PatternMatch,
  PatternMismatch,
  PatternResult,
} from "../expect.js";
import {
  Failure,
  NotEqual,
  PatternDetails,
  Success,
  ValueDescription,
} from "../report.js";

export interface ToBeSerializer<T> {
  readonly expected: string | ((value: T) => string);
  readonly actual: string | ((value: T) => string);
}

function serializeBoth<T>(
  { expected, actual }: { expected: T; actual: T },
  serializer: ToBeSerializer<T>
): { expected: string; actual: string } {
  return {
    expected: serialize(expected, serializer.expected),
    actual: serialize(actual, serializer.actual),
  };
}

function serialize<T>(
  value: T,
  serialize: string | ((value: T) => string)
): string {
  if (typeof serialize === "function") {
    return serialize(value);
  } else {
    return serialize;
  }
}

export class ToBe<T> implements Pattern<unknown, T, undefined> {
  constructor(readonly expected: T, readonly serializer?: ToBeSerializer<T>) {}

  readonly details: PatternDetails = {
    name: "toBe",
    description: "Object.is equality",
  };

  check(actual: Described<T>): PatternResult<undefined> {
    if (Object.is(this.expected, actual.value)) {
      return PatternMatch();
    } else {
      return PatternMismatch();
    }
  }

  success(): Success {
    if (this.serializer) {
      return Success({
        pattern: this.details,
        message: `value was ${serialize(
          this.expected,
          this.serializer.expected
        )}`,
      });
    } else {
      return Success({
        pattern: this.details,
        message: `value was equal to expected`,
      });
    }
  }

  failure(actualValue: Described<unknown>): Failure {
    let { actual, expected } = this.#normalize(actualValue);

    return NotEqual({
      actual,
      expected,
      pattern: this.details,
    });
  }

  #normalize(describedActual: Described<unknown>): {
    expected: ValueDescription;
    actual: ValueDescription;
  } {
    let { serializer } = this;

    if (serializer) {
      let { actual, expected } = serializeBoth(
        {
          actual: describedActual.value,
          expected: this.expected,
        },
        this.serializer
      );

      return {
        expected: ValueDescription(expected),
        actual: ValueDescription(actual, describedActual.description),
      };
    } else {
      return {
        expected: ValueDescription(this.expected),
        actual: describedActual.toValueDescription(),
      };
    }
  }
}

export function toBe<T>(
  value: T,
  serializer?: ToBeSerializer<T> | ((value: T) => string)
): AnyPatternDSL<T> {
  let normalized =
    typeof serializer === "function"
      ? { expected: serializer, actual: serializer }
      : serializer;

  return PatternImpl.of<T, T, UnsafeAny, UnsafeAny>(
    new ToBe(value, normalized)
  );
}
