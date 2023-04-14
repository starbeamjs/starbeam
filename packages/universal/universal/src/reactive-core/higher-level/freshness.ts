import type { Description } from "@starbeam/interfaces";
import { Cell, RUNTIME } from "@starbeam/reactive";

const INITIAL_COUNT = 0;
const INCREMENT_COUNT = 1;

export class ReactiveFreshness {
  #lastChecked: number | undefined;
  #cell: Cell<number>;

  constructor(description: Description | undefined) {
    this.#cell = Cell(INITIAL_COUNT, { description });
  }

  get isStale(): boolean {
    const lastChecked = this.#lastChecked;
    const current = (this.#lastChecked = this.#cell.current);

    return lastChecked !== current;
  }

  expire(): void {
    this.#cell.update((revision) => revision + INCREMENT_COUNT);
  }
}

/**
 * {@linkcode Freshness} is a {@linkcode Reactive} that you can use to track validity in a single
 * consumer.
 *
 * After {@linkcode expire} is called, the {@linkcode isStale} property will return `true` once,
 * and then return `false` until {@linkcode expire} is called again.
 *
 * A {@linkcode Freshness} starts out stale.
 */
export function Freshness(
  description?: string | Description
): ReactiveFreshness {
  return new ReactiveFreshness(RUNTIME.Desc?.("cell", description));
}

export type Freshness = ReactiveFreshness;
