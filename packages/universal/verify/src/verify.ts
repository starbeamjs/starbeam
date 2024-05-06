export class VerificationError<T = unknown> extends Error {
  constructor(
    message: string,
    readonly expectation: Expectation<T>,
  ) {
    super(message);
  }
}

export type VerifyFn = typeof verify;

export function verify<Value, Input extends Value, Output extends Input>(
  value: Value,
  check: (input: Input) => input is Output,
  error?: Expectation<Value>,
): asserts value is Output & Value;
export function verify<Value, Narrow extends Value>(
  value: Value,
  check: (input: Value) => input is Narrow,
  error?: Expectation<Value>,
): asserts value is Narrow;
export function verify(): void {
  // eslint-disable-next-line prefer-rest-params
  const params = [...arguments] as Parameters<typeof verifyFunc>;
  if (import.meta.env.DEV) {
    verifyFunc(...params) 
  }
}
function verifyFunc(
  value: unknown,
  check: (input: unknown) => boolean,
  error?: Expectation<unknown>,
): void {
  if (!check(value)) {
    const associated = ASSOCIATED.get(check);
    const expectation = Expectation.merge(associated, error);

    if (expectation === undefined) {
      const name = check.name;
      throw new VerificationError(
        `Assumption was incorrect: ${name}`,
        expected(),
      );
    } else {
      throw new VerificationError(expectation.message(value), expectation);
    }
  }
}

export function verified<T, U extends T>(
  value: T,
  check: (input: T) => input is U,
  error?: Expectation<T>,
): U;

export function verified(v: unknown): unknown {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line prefer-rest-params
    const [value, check, error] = [...arguments] as Parameters<typeof verified>;
    verify(value, check, error);
  }
  return v;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Expectation<In = any> {
  static create<In>(description?: string): Expectation<In> {
    return new Expectation(description, undefined, undefined, undefined);
  }

  static merge<In>(
    associated: Expectation<In> | undefined,
    specified: Expectation<In> | undefined,
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
      specified.#when ?? associated.#when,
    );
  }

  readonly #description: string | undefined;
  readonly #to: To | undefined;
  readonly #actual: ((input: In) => string | undefined) | undefined;
  readonly #when: string | undefined;

  private constructor(
    description: string | undefined,
    to: To | undefined,
    got: ((input: In) => string | undefined) | undefined,
    when: string | undefined,
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
    const to: To | undefined =
      typeof updatedTo === "string"
        ? [toRelationship(this.#to) ?? "to be", updatedTo]
        : updatedTo;
    const actual = updater.actual
      ? updater.actual(this.#actual)
      : (this.#actual as ((input: NewIn) => string | undefined) | undefined);

    return new Expectation(
      description,
      to,
      actual,
      updater.when ? updater.when(this.#when) : this.#when,
    );
  }

  toBe(kind: string): Expectation<In> {
    return new Expectation(
      this.#description,
      ["to be", kind],
      this.#actual,
      this.#when,
    );
  }

  toHave(items: string): Expectation<In> {
    return new Expectation(
      this.#description,
      ["to have", items],
      this.#actual,
      this.#when,
    );
  }

  butGot<NewIn extends In>(
    kind: string | ((value: NewIn) => string),
  ): Expectation<NewIn> {
    return new Expectation(
      this.#description,
      this.#to,
      typeof kind === "string" ? () => kind : kind,
      this.#when,
    );
  }

  when(situation: string): Expectation<In> {
    return new Expectation(
      this.#description,
      this.#to,
      this.#actual,
      situation,
    );
  }

  message(input: In): string {
    let message = ``;

    if (this.#when) {
      message += `When ${this.#when}: `;
    }

    message += `Expected ${this.#description ?? "value"}`;

    if (this.#to) {
      message += ` ${toRelationship(this.#to)} ${toKind(this.#to)}`;
    }

    if (this.#actual) {
      message += `, but it was ${String(this.#actual(input))}`;
    }

    return message;
  }
}

export type Relationship = "to be" | "to have" | "to be one of";

const REL_INDEX = 0;
const KIND_INDEX = 1;

export type To = [relationship: Relationship, kind: string];

export function toRelationship(to: To): Relationship;
export function toRelationship(to?: To): Relationship | undefined;
export function toRelationship(to?: To): Relationship | undefined {
  return to?.[REL_INDEX];
}

export function toKind(to: To): string;
export function toKind(to?: To): string | undefined;
export function toKind(to?: To): string | undefined {
  return to?.[KIND_INDEX];
}

export function expected(description?: string): Expectation {
  return Expectation.create(description);
}

if (import.meta.env.DEV) {
  expected.as = expected;
  expected.toBe = (kind: string): Expectation => expected().toBe(kind);
  expected.toHave = (items: string): Expectation => expected().toHave(items);
  expected.when = (situation: string): Expectation => expected().when(situation);
  expected.butGot = <In>(
    kind: string | ((input: In) => string),
  ): Expectation<In> => expected().butGot(kind);


// eslint-disable-next-line @typescript-eslint/no-explicit-any
  expected.associate = <Check extends (input: In) => any, In>(
    check: Check,
    expectation: Expectation<In>,
  ): Check extends infer C ? C : never => {
    ASSOCIATED.set(check, expectation);
    return check as Check extends infer C ? C : never;
  };
  expected.updated = <In, NewIn = In>(
    check: (input: In) => boolean,
    updater: Updater<In, NewIn>,
  ): Expectation<NewIn> => {
    const expectation = ASSOCIATED.get(check) ?? expected();

    return expectation.update(updater);
  };  
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

// eslint-disable-next-line @typescript-eslint/consistent-generic-constructors
const ASSOCIATED: WeakMap<AnyFn, Expectation> = new WeakMap();

interface Updater<In, NewIn = In> {
  description?: (description: string | undefined) => string | undefined;
  to?: (to: To | undefined) => string | To | undefined;
  actual?: (
    actual: ((input: In) => string | undefined) | undefined,
  ) => ((input: NewIn) => string | undefined) | undefined;
  when?: (when: string | undefined) => string | undefined;
}

