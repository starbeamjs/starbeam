import { Memo, Reactive } from "@starbeam/reactive";
import {
  LIFETIME,
  REACTIVE,
  ReactiveInternals,
  type ReactiveProtocol,
} from "@starbeam/timeline";
import { Stack } from "@starbeam/trace-internals/node_modules/@starbeam/debug-utils";
import { lifetime } from "../public.js";
import type { PhasedBuilder } from "./linkable.js";
import type { Log } from "./log.js";

// Hack to allow these types to be in scope for {@link} directives in docs
// without being erased by Organize Imports.
export type Docs = { Log: typeof Log };

/**
 * A {@link PhasedInstance} represents a restartable {@link PhasedTask} with
 * optional lifetime.
 *
 * Whenever the formula that created the {@link PhasedTask} invalidates, the
 * {@link PhasedTask} will be finalized, and a new one will be created.
 *
 * When the entire `PhasedInstance` is finalized, its _current_
 * {@link PhasedTask} is finalized.
 *
 * @see PhasedReactive for implementation details.
 */
export class PhasedInstance<T> implements ReactiveProtocol {
  static create<T>(instance: Reactive<PhasedTask<T>>): PhasedInstance<T> {
    return new PhasedInstance(
      Memo(() => instance.current.current, Reactive.description(instance))
    );
  }

  readonly #instance: Reactive<T>;

  private constructor(instance: Reactive<T>) {
    this.#instance = instance;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#instance[REACTIVE];
  }

  get current(): T {
    return this.#instance.current;
  }

  poll(): T {
    return this.current;
  }
}

/**
 * A {@link PhasedTask} represents a single execution of the task that belongs
 * to a {@link PhasedInstance}.
 *
 * If a `PhasedTask`'s {@link Memo} invalidates, the `PhasedTask` is finalized,
 * and the parent {@link PhasedInstance} will create a new `PhasedTask.
 *
 * This finalization step will:
 *
 * - evaluate any finalizers associated with the task
 * - finalize any children linked with the task
 *
 * TL;DR A `PhasedTask<T>` is a `Memo<T>` with lifetime.
 */
export class PhasedTask<T> implements ReactiveProtocol {
  static create<T>(cell: Reactive<T>): PhasedTask<T> {
    return new PhasedTask(cell);
  }

  static finalize<T>(task: PhasedTask<T>): void {
    LIFETIME.finalize(task);
  }

  readonly #cell: Reactive<T>;
  readonly [REACTIVE]: ReactiveInternals;

  private constructor(cell: Reactive<T>) {
    this.#cell = cell;
    this[REACTIVE] = cell[REACTIVE];
  }

  get current(): T {
    return this.#cell.current;
  }
}

/**
 * `Phased` is a general-purpose mechanism for creating reactive values using a
 * two-phased approach.
 *
 * A {@link PhasedReactive} represents a stateful [task] and associated cells.
 * The outer formula of a `PhasedReactive` drives the task and converts steps in
 * the task (usually events) into changes to the data cells that it defined.
 *
 * The inner formula consolidates those cells into a single runtime value (the
 * `T` in `PhasedReactive<T>`).
 *
 * A `PhasedReactive` can also be a [stateful object], which means that it can
 * be linked to a parent object and finalized when the parent object is
 * finalized.
 *
 * Important: This allows the entire task to restart if any of the cells used by
 * the outer formula change, while allowing the `PhasedReactive` to update its
 * **own** data cells.
 *
 * Also important: Since the `PhasedReactive` only exposes its data cells
 * through a formula, they are naturally updated only in [actions]. This allows
 * us to have reactive values that represent the current state of an ongoing
 * task without violating [reactive phasing], a fundamental principle of
 * Starbeam reactivity.
 *
 * This function is used by several concrete implementations of phased
 * reactives:
 *
 * - {@link Log}
 * - {@link Resource}
 * - {@link Task}
 *
 * [task]: TODO
 * [reactive phasing]: TODO
 */
export function PhasedReactive<T, L extends PhasedBuilder>({
  blueprint,
  createBuilder,
  description,
}: {
  blueprint: (linkable: L) => Reactive<T>;
  createBuilder: () => L;
  description?: string | { internal: number };
}): PhasedInstance<T> {
  let inferredDescription: string;

  if (typeof description === "string") {
    inferredDescription = description;
  } else {
    inferredDescription = Stack.describeCaller(
      (description?.internal || 1) + 1
    );
  }

  // We are constructing a long-lived PhasedInstance, which represents a
  // restartable task. There will only ever be one PhasedTask at a time, and it
  // is automatically restarted when any dependencies of the user code that
  // constructed the task have changed.
  //
  // In this context, "restarting" means finalizing the existing task and
  // creating a brand new instance.
  let task: PhasedTask<T>;

  // Return a memo that will always return a hook. If the memo invalidates, it
  // will automatically finalize the last hook and construct a new hook by
  // invoking the blueprint again.
  const memo = Memo(() => {
    if (task) {
      PhasedTask.finalize(task);
    }

    // Create a new instance of the builder for this PhasedTask. The builder
    // collects up finalizers and linked children while we are building up the
    // PhasedReactive. Implementations can also provide specialized builders for
    // specific scenarios (e.g. the Log builder doesn't need a separate setup
    // function, while the Modifier builder defers the inner callback until the
    // associated element is attached).
    const builder = createBuilder();

    LIFETIME.withFrame(builder, () => {
      // Construct a new instance PhasedTask. This is the _current_ PhasedTask for
      // the long-lived PhasedInstance we are in the middle of constructing.
      task = PhasedTask.create(blueprint(builder));
    });

    // Link the task we have just created with the builder instance. As a
    // result, when the task is finalized (above), any finalizers associated
    // with the builder will be run and any of its linked children will be
    // finalized.
    LIFETIME.link(builder, task);

    // Next, link the PhasedInstance we're in the process of creating to the
    // current task. If the PhasedInstance is finalized, its final task will be
    // finalized.
    //
    // This code depends on the fact that the callback we are inside of will not
    // run until the `Memo` we are constructing is polled, and we initialize the
    // `instance` immediately after the `Memo` is created. This means that
    // `PhasedInstance.create` **must not** poll the memo inline, because that
    // would result in a Temporal Dead Zone error.
    lifetime.link(instance, task);

    return task;
  }, `constructor for: ${inferredDescription}`);

  const instance = PhasedInstance.create(memo);
  return instance;
}
