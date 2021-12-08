import { Pattern } from "./expect";
import { Failure, Success, NotEqual, PatternDetails } from "./report";

export interface ToBeDescription {
  actual: string;
  expected: string;
}

export class ToBe<T> implements Pattern<unknown, T> {
  constructor(readonly value: T, readonly description?: ToBeDescription) {}

  readonly details: PatternDetails = {
    name: "toBe",
    description: "Object.is equality",
  };

  check(actual: unknown): actual is T {
    return Object.is(this.value, actual);
  }
  success(actual: T): Success {
    if (this.description) {
      let { actual, expected } = this.description;
      return Success({
        pattern: this.details,
        message: `${actual} was equal to ${expected}`,
      });
    } else {
      return Success({ pattern: this.details, message: "were equal" });
    }
  }
  failure(actual: unknown): Failure {
    if (this.description) {
      throw Error("todo: descriptions in toBe");
    } else {
      return NotEqual({ actual, expected: this.value, pattern: this.details });
    }
  }
}

export function toBe<T>(value: T, description?: ToBeDescription): ToBe<T> {
  return new ToBe(value, description);
}
