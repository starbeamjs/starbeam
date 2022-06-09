export type ValidatorType = "timestamp" | "digest" | "static";

interface Timestamp {
  gt(other: Timestamp): boolean;
}

interface ReactiveInternals {
  isUpdatedSince(timestamp: Timestamp): boolean;
  debug: { lastUpdated: Timestamp };
}

export class StaticValidatorDescription {
  readonly type = "static";

  isValid(): boolean {
    return true;
  }
}

export class TimestampValidatorDescription {
  static from(internals: ReactiveInternals) {
    return new TimestampValidatorDescription(internals);
  }

  readonly type: ValidatorType = "timestamp";

  #internals: ReactiveInternals;

  private constructor(internals: ReactiveInternals) {
    this.#internals = internals;
  }

  get lastUpdated(): Timestamp {
    return this.#internals.debug.lastUpdated;
  }

  isValid(since: Timestamp): boolean {
    return this.#internals.isUpdatedSince(since);
  }
}

export class DigestValidatorDescription {
  readonly type: ValidatorType = "digest";

  #currentDigest: () => string;

  constructor(updated: () => string) {
    this.#currentDigest = updated;
  }

  isValid(lastDigest: string): boolean {
    return this.#currentDigest() === lastDigest;
  }
}

export type ValidatorDescription =
  | StaticValidatorDescription
  | TimestampValidatorDescription
  | DigestValidatorDescription;
