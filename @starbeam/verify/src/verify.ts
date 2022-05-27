export function verify<T, U extends T>(
  value: T,
  check: (input: T) => input is U,
  error?: Expected<T>
): asserts value is U {
  if (!check(value)) {
    const associated = ASSOCIATED.get(check);
    const expected = Expected.merge(associated, error);

    if (expected === undefined) {
      const name = check.name;
      throw Error(`Assumption was incorrect: ${name}`);
    } else {
      throw Error(expected.message(value));
    }
  }
}

export function verified<T, U extends T>(
  value: T,
  check: (input: T) => input is U,
  error?: Expected<T>
): U {
  verify(value, check, error);
  return value;
}

export class Expected<In> {
  static create(description?: string) {
    return new Expected(description, undefined, undefined, undefined);
  }

  static merge<In>(
    associated: Expected<In> | undefined,
    specified: Expected<In> | undefined
  ): Expected<In> | undefined {
    if (!associated && !specified) {
      return undefined;
    }

    if (!associated) {
      return specified;
    }

    if (!specified) {
      return associated;
    }

    return new Expected(
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

  as(description: string): Expected<In> {
    return new Expected(description, this.#to, this.#actual, this.#when);
  }

  update<NewIn>(updater: Updater<In, NewIn>): Expected<NewIn> {
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

    return new Expected(
      description,
      to,
      actual,
      updater.when ? updater.when(this.#when) : this.#when
    );
  }

  toBe(kind: string): Expected<In> {
    return new Expected(
      this.#description,
      ["to be", kind],
      this.#actual,
      this.#when
    );
  }

  toHave(items: string): Expected<In> {
    return new Expected(
      this.#description,
      ["to have", items],
      this.#actual,
      this.#when
    );
  }

  butGot<In>(kind: (value: In) => string): Expected<In> {
    return new Expected(this.#description, this.#to, kind, this.#when);
  }

  when(situation: string) {
    return new Expected(this.#description, this.#to, this.#actual, situation);
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
      message += `, but got ${this.#actual(input)}`;
    }

    return message;
  }
}

export type Relationship = "to be" | "to have" | "to be one of";
export type To = [relationship: Relationship, kind: string];

export function expected(description?: string): Expected<any> {
  return Expected.create(description);
}

expected.as = expected;
expected.toBe = (kind: string): Expected<any> => expected().toBe(kind);
expected.toHave = (items: string): Expected<any> => expected().toHave(items);
expected.when = (situation: string): Expected<any> =>
  expected().when(situation);
expected.butGot = <In>(kind: (input: In) => string): Expected<In> =>
  expected().butGot(kind);

const ASSOCIATED: WeakMap<Function, Expected<any>> = new WeakMap();

expected.associate = <Check extends (input: In) => any, In>(
  check: Check,
  expected: Expected<In>
): Check extends infer C ? C : never => {
  ASSOCIATED.set(check, expected);
  return check as any;
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
): Expected<NewIn> => {
  const expectation = ASSOCIATED.get(check) ?? expected();

  return expectation.update(updater);
};
