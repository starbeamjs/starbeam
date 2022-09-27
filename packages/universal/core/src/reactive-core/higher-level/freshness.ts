import { type Description, descriptionFrom } from "@starbeam/debug";

import { Cell } from "../cell.js";

export class ReactiveFreshness {
  #lastChecked: number | undefined;
  #cell: Cell<number>;

  constructor(description: Description) {
    this.#cell = Cell(0, { description });
  }

  get isStale(): boolean {
    const lastChecked = this.#lastChecked;
    const current = (this.#lastChecked = this.#cell.current);

    return lastChecked !== current;
  }

  expire(): void {
    this.#cell.update((revision) => revision + 1);
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
  return new ReactiveFreshness(
    descriptionFrom({
      type: "cell",
      api: { package: "@starbeam/core", name: "Freshness" },
      fromUser: description,
    })
  );
}

export type Freshness = ReactiveFreshness;
