export class VerificationError<T = unknown> extends Error {
  constructor(message: string, readonly expectation: Expectation<T>) {
    super(message);
  }
}

const DEBUG = import.meta.env ? !import.meta.env.PROD : false;

export function verify<T, U extends T>(
  value: T,
  check: (input: T) => input is U,
  error?: Expectation<T>
): asserts value is U;
export function verify<T>(
  value: T,
  check: (input: T) => boolean,
  error?: Expectation<T>
): asserts value is T;
export function verify<T, U extends T>(
  value: T,
  check: ((input: T) => input is U) | ((input: T) => boolean),
  error?: Expectation<T>
): asserts value is U {
  if (!check(value)) {
    const associated = ASSOCIATED.get(check);
    const expectation = Expectation.merge(associated, error);

    if (expectation === undefined) {
      const name = check.name;
      throw new VerificationError(
        `Assumption was incorrect: ${name}`,
        expected()
      );
    } else {
      throw new VerificationError(expectation.message(value), expectation);
    }
  }
}

verify.noop = <T, U extends T>(
  value: T,
  _check: ((input: T) => input is U) | ((input: T) => boolean),
  _error?: Expectation<T>
): asserts value is U => {
  return;
};

export function verified<T, U extends T>(
  value: T,
  check: (input: T) => input is U,
  error?: Expectation<T>
): U {
  verify(value, check, error);
  return value;
}

verified.noop = <T, U extends T>(
  value: T,
  _check: (input: T) => input is U,
  _error?: Expectation<T>
): U => {
  return value as U;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Expectation<In = any> {
  static create(description?: string) {
    return new Expectation(description, undefined, undefined, undefined);
  }

  static merge<In>(
    associated: Expectation<In> | undefined,
    specified: Expectation<In> | undefined
  ): Expectation<In> | undefined {
    if (!associated && !specified) {
      return undefined;
    }

    if (!associated) {
      return specified;
    }

    if (!specified) {
      return associated;
    }

    return new Expectation(
      specified.#description,
      specified.#to ?? associated.#to,
      specified.#actual ?? associated.#actual,
      specified.#when ?? associated.#when
    );
  }

  readonly #description: string | void | undefined;
  readonly #to: To | void | undefined;
  readonly #actual:
    | ((input: In) => string | void | undefined)
    | void
    | undefined;
  readonly #when: string | void | undefined;

  private constructor(
    description: string | void | undefined,
    to: To | void | undefined,
    got: ((input: In) => string | void | undefined) | void | undefined,
    when: string | void | undefined
  ) {
    this.#description = description;
    this.#to = to;
    this.#actual = got;
    this.#when = when;
  }

  as(description: string): Expectation<In> {
    return new Expectation(description, this.#to, this.#actual, this.#when);
  }

  update<NewIn>(updater: Updater<In, NewIn>): Expectation<NewIn> {
    const description = updater.description
      ? updater.description(this.#description)
      : this.#description;
    const updatedTo = updater.to ? updater.to(this.#to) : this.#to;
    const to: To | void =
      typeof updatedTo === "string"
        ? [this.#to?.[0] ?? "to be", updatedTo]
        : updatedTo;
    const actual = updater.actual
      ? updater.actual(this.#actual)
      : (this.#actual as ((input: NewIn) => string | undefined) | undefined);

    return new Expectation(
      description,
      to,
      actual,
      updater.when ? updater.when(this.#when) : this.#when
    );
  }

  toBe(kind: string): Expectation<In> {
    return new Expectation(
      this.#description,
      ["to be", kind],
      this.#actual,
      this.#when
    );
  }

  toHave(items: string): Expectation<In> {
    return new Expectation(
      this.#description,
      ["to have", items],
      this.#actual,
      this.#when
    );
  }

  butGot<In>(kind: string | ((value: In) => string)): Expectation<In> {
    return new Expectation(
      this.#description,
      this.#to,
      typeof kind === "string" ? () => kind : kind,
      this.#when
    );
  }

  when(situation: string) {
    return new Expectation(
      this.#description,
      this.#to,
      this.#actual,
      situation
    );
  }

  message(input: In) {
    let message = ``;

    if (this.#when) {
      message += `When ${this.#when}: `;
    }

    message += `Expected ${this.#description ?? "value"}`;

    if (this.#to) {
      message += ` ${this.#to[0]} ${this.#to[1]}`;
    }

    if (this.#actual) {
      message += `, but got ${String(this.#actual(input))}`;
    }

    return message;
  }
}

export type Relationship = "to be" | "to have" | "to be one of";
export type To = [relationship: Relationship, kind: string];

export function expected(description?: string): Expectation {
  return Expectation.create(description);
}

expected.as = expected;
expected.toBe = (kind: string): Expectation => expected().toBe(kind);
expected.toHave = (items: string): Expectation => expected().toHave(items);
expected.when = (situation: string): Expectation => expected().when(situation);
expected.butGot = <In>(
  kind: string | ((input: In) => string)
): Expectation<In> => expected().butGot(kind);

// eslint-disable-next-line
const ASSOCIATED: WeakMap<Function, Expectation<any>> = new WeakMap();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
expected.associate = <Check extends (input: In) => any, In>(
  check: Check,
  expected: Expectation<In>
): Check extends infer C ? C : never => {
  ASSOCIATED.set(check, expected);
  return check as Check extends infer C ? C : never;
};

interface Updater<In, NewIn = In> {
  description?: (description: string | void | undefined) => string | void;
  to?: (to: To | void | undefined) => string | To | void;
  actual?: (
    actual: ((input: In) => string | void) | void | undefined
  ) => ((input: NewIn) => string | void) | void;
  when?: (when: string | void | undefined) => string | void;
}

expected.updated = <In, NewIn = In>(
  check: (input: In) => boolean,
  updater: Updater<In, NewIn>
): Expectation<NewIn> => {
  const expectation = ASSOCIATED.get(check) ?? expected();

  return expectation.update(updater);
};
