import { Abstraction } from "@starbeam/debug";
import { assert } from "@starbeam/verify";
import { LIFETIME } from "../core/lifetime/lifetime.js";
import { TIMELINE } from "../core/timeline/timeline.js";
import { UNINITIALIZED } from "../fundamental/constants.js";
import type { Reactive } from "../fundamental/types.js";
import { Cell, ReactiveCell } from "../reactive/cell.js";
import { LOGGER } from "../strippable/trace.js";

export type PollResult<T> =
  | { status: "initial"; value: T }
  | { status: "unchanged"; value: T }
  | { status: "changed"; value: T };

export interface ExternalSubscription<T = unknown> {
  poll: () => PollResult<T>;
  unsubscribe: () => void;
}

function initialize<S extends ExternalSubscription>(subscription: S): S {
  LIFETIME.on.finalize(subscription, () => subscription.unsubscribe());
  return subscription;
}

/**
 * This API allows external consumers of Starbeam Reactive values to subscribe
 * (and unsubscribe) to a signal that a change in the underlying value is ready.
 *
 * It does *not* recompute the value, which has several benefits:
 *
 * - If a change was ready multiple times before a consumer had a chance to ask
 *   for the value of a reactive computation, the computation will only occur
 *   once.
 * - If a change was ready, but its consumer never needs the value, the reactive
 *   computation will never occur.
 *
 * The change readiness notification occurs synchronously and is not batched. It
 * is not intended to trigger synchronous re-renders, but rather to inform the
 * consumer that a scheduled revalidation is needed.
 *
 * The `subscribe` function returns an `ExternalSubscription`, which provides:
 *
 * - a `poll()` method that the consumer can call once it receives the change
 *   readiness notification. The `poll()` method returns a status (`initial` or
 *   `changed` or `unchanged`) as well as the current value.
 * - an `unsubscribe()` method that the consumer should call when it is no
 *   longer interested in receiving notifications. Once this method is called,
 *   no further notifications will occur.
 */
export function subscribe<T>(
  reactive: Reactive<T>,
  ready: () => void,
  description = `subscriber (to ${
    reactive.description
  }) <- ${Abstraction.callerFrame()}`
): ExternalSubscription<T> {
  if (reactive.isConstant()) {
    return initialize(ConstantSubscription.create(reactive.current));
  } else if (reactive instanceof ReactiveCell) {
    return initialize(CellSubscription.create(reactive, ready, description));
  } else {
    return initialize(
      ReactiveSubscription.create(reactive, ready, description)
    );
  }
}

class ConstantSubscription<T> implements ExternalSubscription<T> {
  static create<T>(value: T): ConstantSubscription<T> {
    return new ConstantSubscription(value);
  }

  readonly #value: T;

  private constructor(value: T) {
    this.#value = value;
  }

  poll = (): PollResult<T> => ({ status: "unchanged", value: this.#value });
  unsubscribe = () => {
    /* noop */
  };
}

/**
 * This is a special-case of subscription to a single cell that doesn't require
 * much bookkeeping.
 */
class CellSubscription<T> implements ExternalSubscription<T> {
  static create<T>(
    cell: Cell<T>,
    ready: () => void,
    description: string
  ): CellSubscription<T> {
    let teardown = TIMELINE.on.update(cell, ready);
    return new CellSubscription(cell, UNINITIALIZED, teardown, description);
  }

  #last: T | UNINITIALIZED;
  readonly #reactive: Reactive<T>;
  readonly #description: string;

  private constructor(
    reactive: Cell<T>,
    last: T | UNINITIALIZED,
    readonly unsubscribe: () => void,
    description: string
  ) {
    this.#reactive = reactive;
    this.#last = last;
    this.#description = description;
  }

  poll = (): PollResult<T> => {
    let value = this.#reactive.current;

    if (this.#last === UNINITIALIZED) {
      this.#last = value;
      return { status: "initial", value };
    } else if (this.#last === value) {
      return { status: "unchanged", value };
    } else {
      return { status: "changed", value };
    }
  };
}

class ReactiveSubscription<T> implements ExternalSubscription<T> {
  static create<T>(
    reactive: Reactive<T>,
    ready: () => void,
    description: string
  ): ReactiveSubscription<T> {
    let cells = new Map();

    if (reactive.cells !== UNINITIALIZED) {
      for (let cell of reactive.cells) {
        cells.set(cell, TIMELINE.on.update(cell, ready));
      }
    }

    return new ReactiveSubscription(
      UNINITIALIZED,
      reactive,
      cells,
      ready,
      description
    );
  }

  #last: T | UNINITIALIZED;
  readonly #reactive: Reactive<T>;
  readonly #cells: Map<Cell, () => void>;
  readonly #notify: () => void;
  readonly #description: string;

  private constructor(
    last: T | UNINITIALIZED,
    reactive: Reactive<T>,
    cells: Map<Cell, () => void>,
    notify: () => void,
    description: string
  ) {
    this.#last = last;
    this.#reactive = reactive;
    this.#cells = cells;
    this.#notify = notify;
    this.#description = description;
  }

  poll = (): PollResult<T> => {
    let newValue = this.#reactive.current;
    let newCells = this.#reactive.cells;

    assert(
      newCells !== UNINITIALIZED,
      `A reactive's cells should not be uninitialized once its value was consumed`
    );

    this.#sync(new Set(newCells));

    if (this.#last === newValue) {
      return { status: "unchanged", value: newValue };
    } else {
      this.#last = newValue;
      return { status: "changed", value: newValue };
    }
  };

  unsubscribe = () => {
    for (let teardown of this.#cells.values()) {
      teardown();
    }
  };

  #sync(newCells: Set<Cell>): void {
    for (let [cell, teardown] of this.#cells) {
      if (!newCells.has(cell)) {
        LOGGER.trace.log(
          `tearing down (${this.#description}) cell`,
          cell,
          this.#notify
        );
        teardown();
        this.#cells.delete(cell);
      }
    }

    for (let cell of newCells) {
      if (!this.#cells.has(cell)) {
        LOGGER.trace.log(
          `setting up (${this.#description}) cell`,
          cell,
          this.#notify
        );

        let teardown = TIMELINE.on.update(cell, this.#notify);
        this.#cells.set(cell, teardown);
      }
    }
  }
}
