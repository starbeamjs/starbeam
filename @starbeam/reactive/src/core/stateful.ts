import { Stack } from "@starbeam/debug-utils";
import {
  FinalizedFrame,
  LIFETIME,
  REACTIVE,
  ReactiveInternals,
  TIMELINE,
  type IntoFinalizer,
  type MutableInternals,
} from "@starbeam/timeline";
import { CompositeInternals } from "../internals/composite.js";
import type { ReactiveValue } from "../reactive.js";

/**
 * {@link FormulaState} represents the an instance of a formula and an
 * associated {@link FinalizedFrame}.
 */
class FormulaState<T> {
  static evaluate<T>(
    formula: () => T,
    description: string
  ): { state: FormulaState<T>; value: T } {
    const { frame, value } = TIMELINE.evaluateFormula(formula, description);

    return {
      state: new FormulaState(formula, frame, description),
      value,
    };
  }

  readonly #formula: () => T;
  #frame: FinalizedFrame<T>;
  readonly #description: string;

  private constructor(
    formula: () => T,
    frame: FinalizedFrame<T>,
    description: string
  ) {
    this.#formula = formula;
    this.#frame = frame;
    this.#description = description;
  }

  get dependencies(): readonly MutableInternals[] {
    return this.#frame.dependencies;
  }

  poll(): { state: "unchanged" | "changed"; value: T } {
    const validation = this.#frame.validate();

    if (validation.status === "valid") {
      return { state: "unchanged", value: validation.value };
    }

    const { frame, value } = TIMELINE.evaluateFormula(
      this.#formula,
      this.#description
    );

    this.#frame = frame;

    return { state: "changed", value };
  }
}

export class StatefulReactiveFormula<T extends object>
  implements ReactiveValue<T>
{
  static create<T extends object>(
    task: TaskBlueprint<T>,
    parent: object,
    description: string
  ): StatefulReactiveFormula<T> {
    const { state: statefulState, value: taskFormula } = FormulaState.evaluate(
      () => TaskBuilder.build(task, parent),
      description
    );

    const { state: taskState, value: instance } = FormulaState.evaluate(
      taskFormula,
      description
    );

    return new StatefulReactiveFormula(statefulState, description, taskState);
  }

  readonly #stateful: FormulaState<() => T>;
  readonly #description: string;
  #task: FormulaState<T>;

  private constructor(
    stateful: FormulaState<() => T>,
    description: string,
    task: FormulaState<T>
  ) {
    this.#stateful = stateful;
    this.#description = description;
    this.#task = task;
  }

  get [REACTIVE](): ReactiveInternals {
    return CompositeInternals(
      [...this.#stateful.dependencies, ...this.#task.dependencies],
      this.#description
    );
  }

  get current(): T {
    const stateful = this.#stateful.poll();

    if (stateful.state === "changed") {
      const { state, value } = FormulaState.evaluate(
        stateful.value,
        this.#description
      );
      this.#task = state;
      return value;
    }

    return this.#task.poll().value;
  }
}

interface TaskBlueprint<T> {
  (builder: TaskBuilder): () => T;
}

class TaskBuilder {
  /**
   * Take a {@link TaskBlueprint} and build it into a formula that will
   * construct the task (the "task formula").
   *
   * The `TaskBlueprint` is evaluated immediately, which collects up finalizers,
   * but the **task** is constructed later. When the task is ultimately
   * constructed, the collected finalizers will be linked to the task, and the
   * task will be linked to the parent passed in here.
   *
   * This creates a two-phase instantiation, with each phase having its own
   * dependencies.
   */
  static build<T extends object>(
    create: TaskBlueprint<T>,
    parent: object
  ): () => T {
    const builder = new TaskBuilder(new Set());
    const formula = create(builder);

    return () => {
      const instance = formula();

      for (const finalizer of builder.#finalizers) {
        LIFETIME.on.finalize(instance, finalizer);
      }

      LIFETIME.link(parent, instance);

      return instance;
    };
  }

  readonly #finalizers: Set<IntoFinalizer>;

  private constructor(finalizers: Set<IntoFinalizer>) {
    this.#finalizers = finalizers;
  }

  readonly on = {
    finalize: (finalizer: IntoFinalizer) => {
      LIFETIME.on.finalize(this, finalizer);
    },
  };
}

export function StatefulFormula<T extends object>(
  task: TaskBlueprint<T>,
  description = Stack.describeCaller()
): (parent: object) => StatefulReactiveFormula<T> {
  return (parent) => {
    return StatefulReactiveFormula.create(task, parent, description);
  };
}
