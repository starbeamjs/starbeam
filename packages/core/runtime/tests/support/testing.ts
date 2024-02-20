import { Overload } from "@starbeam/core-utils";
import { expect } from "vitest";

export class Staleness {
  #stale = false;

  expect(staleness: "stale" | "fresh"): void;
  expect<T>(perform: () => T, staleness: "stale" | "fresh"): T;
  expect<T>(
    ...args:
      | [staleness: "stale" | "fresh"]
      | [perform: () => T, staleness: "stale" | "fresh"]
  ): T | void {
    const [result, stale] = Overload<[T | undefined, "stale" | "fresh"]>()
      .of(args)
      .resolve({
        [1]: (staleness) => [undefined, staleness],
        [2]: (perform, staleness) => [perform(), staleness],
      });

    expect(this.#stale ? "stale" : "fresh").toBe(stale);
    this.#stale = false;
    return result;
  }

  invalidate(): void {
    this.#stale = true;
  }
}
