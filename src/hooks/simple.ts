import { AbstractReactive, Reactive } from "../reactive/core.js";
import type { ReactiveMetadata } from "../reactive/metadata.js";
import { verified } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
import { LOGGER } from "../strippable/trace.js";
import { expected } from "../strippable/verify-context.js";
import type { IntoFinalizer } from "../universe.js";
import type { Universe } from "../universe/universe.js";
import type { Hook } from "./hook.js";

export type HookConstructor<T> = (hook: SimpleHook<T>) => Reactive<T>;

/**
 * This class wraps the HookConstructor callback to give it extra debug
 * information. It is returned by universe.hook.
 */
export class HookBlueprint<T> {
  static create<T>(
    universe: Universe,
    construct: HookConstructor<T>,
    description: string
  ): HookBlueprint<T> {
    return new HookBlueprint(universe, construct, description);
  }

  private constructor(
    readonly universe: Universe,
    readonly construct: HookConstructor<T>,
    readonly description: string
  ) {}
}

export class SimpleHook<T> extends AbstractReactive<T> implements Hook<T> {
  static #ids = 0;

  static construct<T>(blueprint: HookBlueprint<T>): Reactive<Hook<T>> {
    let { universe } = blueprint;

    let last: SimpleHook<T> | null = null;

    // Return a memo that will always return a hook. If the memo invalidates, it
    // will automatically finalize the last hook and construct a new hook by
    // invoking the blueprint again.
    return universe.memo(() => {
      if (last) {
        universe.finalize(last);
      }

      // First, construct a new hook that doesn't yet have its reactive value
      // filled in, but is ready to be used to invoke a blueprint.
      last = new SimpleHook(universe, null, blueprint.description);

      // Then, construct the blueprint by invoking its callback. This will
      // collect its top-level dependencies into the memo and produce the
      // reactive value returned by the blueprint. Assign the reactive value to
      // the hook.
      last.#reactive = blueprint.construct(last);

      // Return the hook.
      return last;
    }, `constructor for: ${blueprint.description}`);
  }

  readonly #universe: Universe;
  readonly #description: string;
  readonly #id: number;
  #reactive: Reactive<T> | null;

  constructor(
    universe: Universe,
    reactive: Reactive<T> | null,
    description: string
  ) {
    super();
    universe.on.destroy(this, () =>
      LOGGER.trace.log(`destroying instance of ${description}`)
    );

    this.#universe = universe;
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
    this.#universe.on.destroy(this, finalizer);
  }

  use<T>(blueprint: HookBlueprint<T>): Reactive<T> {
    let hook = SimpleHook.construct(blueprint);

    let hookMemo = this.#universe.memo(() => {
      let currentHook = hook.current;

      this.#universe.lifetime.link(this, currentHook);

      return currentHook;
    }, `memo for: ${blueprint.description} constructor`);

    // however, we need to *avoid* adding the dependencies of the hook's
    // returned reactive to the parent hook constructor *or* this hook
    // constructor.
    return this.#universe.memo(
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
