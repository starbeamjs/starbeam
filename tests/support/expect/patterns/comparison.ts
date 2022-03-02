import type { UnsafeAny } from "@starbeam/fundamental";
import {
  Described,
  PatternImpl,
  PatternMatch,
  PatternMismatch,
  type AnyPatternDSL,
  type Pattern,
  type PatternResult,
} from "../expect.js";
import {
  NotEqual,
  Success,
  ValueDescription,
  type Failure,
  type PatternDetails,
} from "../report.js";

export interface ToBeSerializer<T> {
  readonly expected: string | ((value: T) => string);
  readonly actual: string | ((value: T) => string);
}

export interface NormalizedToBeSerializer<T> {
  readonly expected: (value: T) => string;
  readonly actual: (value: T) => string;
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
  constructor(
    readonly expected: T,
    readonly serializer?: NormalizedToBeSerializer<T>
  ) {}

  readonly details: PatternDetails = {
    name: "toBe",
    description: "Object.is equality",
  };

  check(actual: Described<T>): PatternResult<undefined> {
    const { expected: expectedValue, actual: actualValue } =
      this.#normalizeValues(actual);

    if (expectedValue.compare(actualValue.value)) {
      return PatternMatch();
    } else {
      return PatternMismatch();
    }

    // if ()

    // if (custom) {
    //   const expected = custom.actual[TO_BE]("coerce", this.expected);
    // } else if (Object.is(this.expected, actual.value)) {
    //   return PatternMatch();
    // } else {
    //   return PatternMismatch();
    // }
  }

  #normalizeValues(actual: Described<unknown>): {
    readonly actual: Value;
    readonly expected: Value;
  } {
    const expectedValue = this.expected;
    const actualValue = actual.value;

    if (isCustomValue(actualValue) && isCustomValue(expectedValue)) {
      const expected = CustomValue.create(expectedValue);

      if (expected.typecheck(actualValue)) {
        return {
          expected,
          actual: expected.actual(actualValue as any),
        };
      }
    }

    return {
      expected: DefaultValue.create(
        expectedValue as any,
        this.serializer?.expected
      ),
      actual: DefaultValue.create(actualValue as any, this.serializer?.actual),
    };
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

  failure(describedActual: Described<unknown>): Failure {
    const { expected, actual } = this.#normalizeValues(describedActual);

    const serializedActual = actual.serialize();
    const serializedExpected = expected.serialize();

    if (serializedActual && serializedExpected) {
      return NotEqual({
        actual: ValueDescription(serializedActual, describedActual.description),
        expected: ValueDescription(serializedExpected),
        pattern: this.details,
      });
    } else {
      return NotEqual({
        actual: describedActual.toValueDescription(),
        expected: ValueDescription(this.expected),
        pattern: this.details,
      });
    }

    //   let { actual, expected } = this.#normalize(actualValue);

    //   return NotEqual({
    //     actual,
    //     expected,
    //     pattern: this.details,
    //   });
    // }

    // #normalize(describedActual: Described<unknown>): {
    //   expected: ValueDescription;
    //   actual: ValueDescription;
    // } {
    //   const { serializer } = this;
    //   const expectedValue = this.expected;
    //   const actualValue = describedActual.value;

    //   if (serializer) {
    //     const { actual, expected } = serializeBoth(
    //       {
    //         actual: actualValue as T,
    //         expected: expectedValue,
    //       },
    //       this.serializer as ToBeSerializer<T>
    //     );

    //     return {
    //       expected: ValueDescription(expected),
    //       actual: ValueDescription(actual, describedActual.description),
    //     };
    //   } else if (isCustomValue(actualValue) && isCustomValue(expectedValue)) {
    //     const { actual, expected } = serializeBoth<CustomToBe>(
    //       {
    //         actual: actualValue,
    //         expected: expectedValue as unknown as CustomToBe,
    //       },
    //       CUSTOM_BOTH
    //     );

    //     return {
    //       expected: ValueDescription(expected),
    //       actual: ValueDescription(actual, describedActual.description),
    //     };
    //   } else {
    //     return {
    //       expected: ValueDescription(this.expected),
    //       actual: describedActual.toValueDescription(),
    //     };
    //   }
  }
}

export const TO_BE = Symbol("TO_BE_COMPARE");

interface HasToStringTag {
  [Symbol.toStringTag]: string;
}

function hasToStringTag(value: unknown): value is HasToStringTag {
  return (
    !!value &&
    typeof (value as Partial<HasToStringTag>)[Symbol.toStringTag] === "string"
  );
}

class DefaultValue<T> {
  static create<T>(
    value: T,
    serializer?: (value: T) => string
  ): DefaultValue<T> {
    return new DefaultValue(value, serializer);
  }

  readonly #value: T;
  readonly #serializer?: (value: T) => string;

  private constructor(value: T, serializer?: (value: T) => string) {
    this.#value = value;
    this.#serializer = serializer;
  }

  get value(): T {
    return this.#value;
  }

  get tag(): string {
    const value = this.#value;
    if (
      (typeof value === "object" && value !== null) ||
      typeof value === "function"
    ) {
      if (hasToStringTag(value)) {
        return `[${value[Symbol.toStringTag]}]`;
      }

      return `(${typeof value})`;
    }

    return `(${typeof value})`;
  }

  serialize(): string | void {
    if (this.#serializer) {
      return this.#serializer(this.#value);
    } else {
      return;
    }
  }

  compare(other: T): boolean {
    return Object.is(this.#value, other);
  }

  coerce(): unknown {
    return this.#value;
  }
}

class CustomValue<T extends CustomToBe> {
  static create<T extends CustomToBe>(value: T): CustomValue<T> {
    return new CustomValue(value, value[TO_BE]);
  }

  readonly #value: T;
  readonly #protocol: ToBeProtocol<T>;

  private constructor(value: T, protocol: ToBeProtocol<T>) {
    this.#value = value;
    this.#protocol = protocol;
  }

  get value(): T {
    return this.#value;
  }

  get tag(): string {
    return this.#protocol.tag;
  }

  actual(value: T): CustomValue<T> {
    return new CustomValue(value, this.#protocol);
  }

  typecheck(value: unknown): value is T {
    return this.#protocol.typecheck(value);
  }

  serialize(): string {
    return this.#protocol.serialize(this.#value);
  }

  compare(other: T): boolean {
    return this.#protocol.compare(this.#value, other);
  }
}

type Value = CustomValue<any> | DefaultValue<any>;

export interface ToBeProtocol<T> {
  readonly tag: string;
  readonly typecheck: (value: unknown) => value is T;
  readonly serialize: (value: T) => string;
  readonly compare: (a: T, b: T) => boolean;
}

export interface CustomToBe<T = unknown> {
  readonly [TO_BE]: ToBeProtocol<T>;
}

function isCustomValue(value: unknown | CustomToBe): value is CustomToBe {
  return typeof value === "object" && value !== null && TO_BE in value;
}

export function toBe<T>(
  value: T,
  serializer?: ToBeSerializer<T> | ((value: T) => string)
): AnyPatternDSL<T> {
  return PatternImpl.of<T, T, UnsafeAny, UnsafeAny>(
    new ToBe(value, normalizeSerialize(serializer))
  );
}

function normalizeSerialize<T>(
  serializer?: ToBeSerializer<T> | ((value: T) => string)
): NormalizedToBeSerializer<T> | undefined {
  if (serializer === undefined) {
    return undefined;
  }

  if (typeof serializer === "function") {
    return { expected: serializer, actual: serializer };
  }

  const expected = serializer.expected;
  const actual = serializer.actual;

  return {
    expected: typeof expected === "string" ? () => expected : expected,
    actual: typeof actual === "string" ? () => actual : actual,
  };
}
