import { AbstractReactive, Reactive } from "../reactive/core.js";
import { Memo } from "../reactive/functions/memo.js";
import type { ReactiveMetadata } from "../reactive/metadata.js";
import { IntoFinalizer, LIFETIME } from "../root/lifetime/lifetime.js";
import { verified } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
import { LOGGER } from "../strippable/trace.js";
import { expected } from "../strippable/verify-context.js";
import type { Hook } from "./hook.js";

export type HookConstructor<T> = (hook: SimpleHook<T>) => Reactive<T>;

/**
 * This class wraps the HookConstructor callback to give it extra debug
 * information. It is returned by universe.hook.
 */
export class HookBlueprint<T> {
  static create<T>(
    construct: HookConstructor<T>,
    description: string
  ): HookBlueprint<T> {
    return new HookBlueprint(construct, description);
  }

  private constructor(
    readonly construct: HookConstructor<T>,
    readonly description: string
  ) {}
}

export class SimpleHook<T> extends AbstractReactive<T> implements Hook<T> {
  static #ids = 0;

  static create<T>(
    reactive: Reactive<T> | null,
    description: string
  ): SimpleHook<T> {
    return new SimpleHook(reactive, description);
  }

  static construct<T>(blueprint: HookBlueprint<T>): Reactive<Hook<T>> {
    let last: SimpleHook<T> | null = null;

    // Return a memo that will always return a hook. If the memo invalidates, it
    // will automatically finalize the last hook and construct a new hook by
    // invoking the blueprint again.
    return Memo.create(() => {
      if (last) {
        LIFETIME.finalize(last);
      }

      // First, construct a new hook that doesn't yet have its reactive value
      // filled in, but is ready to be used to invoke a blueprint.
      last = new SimpleHook(null, blueprint.description);

      // Then, construct the blueprint by invoking its callback. This will
      // collect its top-level dependencies into the memo and produce the
      // reactive value returned by the blueprint. Assign the reactive value to
      // the hook.
      last.#reactive = blueprint.construct(last);

      // Return the hook.
      return last;
    }, `constructor for: ${blueprint.description}`);
  }

  readonly #description: string;
  readonly #id: number;
  #reactive: Reactive<T> | null;

  private constructor(reactive: Reactive<T> | null, description: string) {
    super();

    LIFETIME.on.destroy(this, () =>
      LOGGER.trace.log(`destroying instance of ${description}`)
    );

    this.#reactive = reactive;
    this.#description = description;
    this.#id = ++SimpleHook.#ids;
  }

  get metadata(): ReactiveMetadata {
    return this.#presentReactive.metadata;
  }

  get description(): string {
    return `${this.#description} (id = ${this.#id})`;
  }

  onDestroy(finalizer: IntoFinalizer): void {
    LIFETIME.on.destroy(this, finalizer);
  }

  use<T>(blueprint: HookBlueprint<T>): Reactive<T> {
    let hook = SimpleHook.construct(blueprint);

    // however, we need to *avoid* adding the dependencies of the hook's
    // returned reactive to the parent hook constructor *or* this hook
    // constructor.
    return Memo.create(
      () => hook.current.current,
      `memo for: ${blueprint.description} instance`
    );
  }

  get #presentReactive() {
    return verified(
      this.#reactive,
      is.Present,
      expected(`a hook's reactive`)
        .toBe(`present`)
        .when(`its current property is exposed to user code`)
    );
  }

  get current(): T {
    return this.#presentReactive.current;
  }

  poll(): void {
    this.current;
  }
}
