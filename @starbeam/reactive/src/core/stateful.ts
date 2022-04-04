import { Stack } from "@starbeam/debug-utils";
import { UNINITIALIZED } from "@starbeam/fundamental";
import {
  FinalizedFrame,
  LIFETIME,
  REACTIVE,
  ReactiveInternals,
  TIMELINE,
  type IntoFinalizer,
  type MutableInternals
} from "@starbeam/timeline";
import { CompositeInternals } from "../internals/composite.js";
import type { ReactiveValue } from "../reactive.js";
import { Initializable } from "./initializable.js";
import { Marker } from "./marker.js";

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
      state: new FormulaState(formula, frame, value, description),
      value,
    };
  }

  readonly #formula: () => T;
  #frame: FinalizedFrame<T>;
  #lastValue: T;
  readonly #description: string;

  private constructor(
    formula: () => T,
    frame: FinalizedFrame<T>,
    lastValue: T,
    description: string
  ) {
    this.#formula = formula;
    this.#frame = frame;
    this.#lastValue = lastValue;
    this.#description = description;
  }

  get frame(): FinalizedFrame<T> {
    return this.#frame;
  }

  get dependencies(): readonly MutableInternals[] {
    return this.#frame.dependencies;
  }

  poll():
    | { state: "unchanged"; value: T }
    | { state: "changed"; oldValue: T; value: T } {
    const validation = this.#frame.validate();

    if (validation.status === "valid") {
      // TODO: Consume the reactive
      return { state: "unchanged", value: validation.value };
    }

    const oldValue = this.#lastValue;

    const { frame, value } = TIMELINE.evaluateFormula(
      this.#formula,
      this.#description
    );

    this.#lastValue = value;
    this.#frame = frame;

    return { state: "changed", value, oldValue };
  }
}

interface LastEvaluation<T> {
  readonly frame: FinalizedFrame<T>;
  readonly value: T;
}

export class ReactiveFormula<T> implements ReactiveValue<T> {
  static create<T>(formula: () => T, description: string): ReactiveFormula<T> {
    return new ReactiveFormula(
      Marker(description),
      UNINITIALIZED,
      formula,
      description
    );
  }

  #marker: Marker;
  #last: LastEvaluation<T> | UNINITIALIZED;
  readonly #formula: () => T;
  readonly #description: string;

  private constructor(
    marker: Marker,
    last: LastEvaluation<T> | UNINITIALIZED,
    formula: () => T,
    description: string
  ) {
    this.#marker = marker;
    this.#last = last;
    this.#formula = formula;
    this.#description = description;
  }

  get [REACTIVE](): ReactiveInternals {
    if (this.#last === UNINITIALIZED) {
      return this.#marker[REACTIVE];
    } else {
      return CompositeInternals(
        [this.#marker, this.#last.frame],
        this.#description
      );
    }
  }

  get current(): T {
    if (this.#last === UNINITIALIZED) {
      this.#marker.update();
      this.#marker.freeze();
    } else {
      const validation = this.#last.frame.validate();
      if (validation.status === "valid") {
        TIMELINE.didConsume(this.#last.frame);
        return validation.value;
      }
    }

    return this.#evaluate();
  }

  #evaluate(): T {
    const { value, frame } = TIMELINE.evaluateFormula(
      this.#formula,
      this.#description
    );
    TIMELINE.didConsume(frame);
    this.#last = { value, frame };

    return value;
  }
}

export class StatefulReactiveFormula<T> implements ReactiveValue<T> {
  static create<T>(
    createTask: TaskBlueprint<T>,
    parent: object,
    description: string
  ): StatefulReactiveFormula<T> {
    const { state: taskState, value: task } = FormulaState.evaluate(
      () => TaskBuilder.build(createTask, parent, description),
      description
    );

    return new StatefulReactiveFormula(taskState, task, description);
  }

  readonly #taskFormula: FormulaState<Task<T>>;
  readonly #description: string;
  #task: Task<T>;

  private constructor(
    taskFormula: FormulaState<Task<T>>,
    task: Task<T>,
    description: string
  ) {
    this.#taskFormula = taskFormula;
    this.#task = task;
    this.#description = description;
  }

  get [REACTIVE](): ReactiveInternals {
    return CompositeInternals(
      [this.#taskFormula.frame, this.#task.formula],
      this.#description
    );
  }

  get current(): T {
    const task = this.#taskFormula.poll();

    if (task.state === "changed") {
      LIFETIME.finalize(task.oldValue);

      this.#task = task.value;
    }

    return this.#task.current;
  }
}

interface TaskBlueprint<T> {
  (builder: TaskBuilder<T>): () => T;
}

class Task<T> {
  static create<T>(description: string): Task<T> {
    return new Task(
      Initializable.create<ReactiveFormula<T>>(description),
      description
    );
  }

  static initialize<T>(task: Task<T>, formula: ReactiveFormula<T>): void {
    task.#formula = task.#formula.initialize(formula);
  }

  #formula: Initializable<ReactiveFormula<T>>;
  readonly #description: string;

  private constructor(
    formula: Initializable<ReactiveFormula<T>>,
    description: string
  ) {
    this.#formula = formula;
    this.#description = description;
  }

  get formula(): ReactiveFormula<T> {
    return this.#formula.value;
  }

  get current(): T {
    return this.formula.current;
  }
}

export class TaskBuilder<T> {
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
  static build<T>(
    create: TaskBlueprint<T>,
    owner: object,
    description: string
  ): Task<T> {
    const builder = TaskBuilder.#create(Task.create<T>(description));
    const formula = Formula(create(builder), description);

    const task = builder.#finalize(formula);

    LIFETIME.link(owner, task);

    return task;
  }

  static #create<T>(task: Task<T>): TaskBuilder<T> {
    return new TaskBuilder(task);
  }

  readonly #task: Task<T>;

  private constructor(task: Task<T>) {
    this.#task = task;
  }

  readonly on = {
    finalize: (finalizer: IntoFinalizer) => {
      LIFETIME.on.finalize(this.#task, finalizer);
    },
  };

  use<T>(child: Linkable<T>): T {
    return child.owner(this.#task);
  }

  #finalize(formula: ReactiveFormula<T>): Task<T> {
    Task.initialize(this.#task, formula);
    return this.#task;
  }
}

export class Linkable<T> {
  static create<T>(link: (owner: object) => T): Linkable<T> {
    return new Linkable(link);
  }

  readonly #link: (owner: object) => T;

  private constructor(link: (link: object) => T) {
    this.#link = link;
  }

  owner(owner: object): T {
    return this.#link(owner);
  }
}

export function StatefulFormula<T>(
  task: TaskBlueprint<T>,
  description = Stack.describeCaller()
): Linkable<StatefulReactiveFormula<T>> {
  return Linkable.create((owner) =>
    StatefulReactiveFormula.create(task, owner, description)
  );
}

export type StatefulFormula<T> = StatefulReactiveFormula<T>;

/**
 * {@link InitializeFormula} takes a two-phase constructor (a function that
 * returns a formula). Unlike {@link StatefulFormula}, which restarts itself
 * when the constructor invalidates, the constructor of `InitializeFormula` may
 * not invalidate.
 *
 *
 */
export function InitializeFormula<T>(
  construct: () => () => T,
  description = Stack.describeCaller()
): ReactiveFormula<T> {
  const formula = construct();
  return ReactiveFormula.create(formula, description);
}

export function Formula<T>(
  formula: () => T,
  description = Stack.describeCaller()
): ReactiveFormula<T> {
  return ReactiveFormula.create(formula, description);
}

export type Formula<T> = ReactiveFormula<T>;
