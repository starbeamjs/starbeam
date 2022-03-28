import { isObject, UNINITIALIZED } from "@starbeam/fundamental";
import { LIFETIME, type IntoFinalizer } from "@starbeam/lifetime";
import {
  impl,
  Memo,
  Reactive,
  Static,
  type IntoReactive,
} from "@starbeam/reactive";
import {
  REACTIVE,
  ReactiveInternals,
  type ReactiveProtocol,
} from "@starbeam/timeline";
import { LOGGER } from "@starbeam/trace-internals";
import { expected, verified } from "@starbeam/verify";
import { lifetime } from "../public.js";
import { is } from "../strippable/minimal.js";

export type ResourceHookConstructor<T> = (
  hook: SimpleHook<T>
) => IntoReactive<T>;
export type DataHookConstructor<T> = () => Reactive<T>;

export type HookConstructor<T> =
  | ResourceHookConstructor<T>
  | DataHookConstructor<T>;

/**
 * This class wraps the HookConstructor callback to give it extra debug
 * information. It is returned by universe.hook.
 */
export class HookBlueprint<T> {
  static is<T>(value: unknown): value is HookBlueprint<T> {
    return isObject(value) && value instanceof HookBlueprint;
  }

  static create<T>(
    construct: (hook: SimpleHook<T>) => IntoReactive<T>,
    description: string
  ): HookBlueprint<T> {
    return new HookBlueprint<T>(
      (hook) => Reactive.from(construct(hook), description),
      description
    );
  }

  private constructor(
    readonly construct: (hook: SimpleHook<T>) => Reactive<T>,
    readonly description: string
  ) {}

  asData(parent: object): HookInstance<T> {
    return SimpleHook.construct(this, parent);
  }
}

export class HookInstance<T> implements ReactiveProtocol {
  static create<T>(instance: Memo<SimpleHook<T>>): HookInstance<T> {
    return new HookInstance(Memo(() => instance.current.current));
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
}

export class SimpleHook<T> implements Reactive<T> {
  static #ids = 0;

  static reactive<T>(
    reactive: Reactive<T> | UNINITIALIZED,
    description: string
  ): SimpleHook<T> {
    return new SimpleHook(reactive, false, description);
  }

  static value<T>(
    value: T | UNINITIALIZED,
    description: string
  ): SimpleHook<T> {
    return new SimpleHook(Static(value), false, description);
  }

  static construct<T>(
    blueprint: HookBlueprint<T>,
    parent: object
  ): HookInstance<T> {
    let last: SimpleHook<T> | null = null;

    // Return a memo that will always return a hook. If the memo invalidates, it
    // will automatically finalize the last hook and construct a new hook by
    // invoking the blueprint again.
    const memo = Memo(() => {
      if (last) {
        LIFETIME.finalize(last);
      }

      // First, construct a new hook that doesn't yet have its reactive value
      // filled in, but is ready to be used to invoke a blueprint.
      last = SimpleHook.reactive(UNINITIALIZED, blueprint.description);

      lifetime.link(parent, last);

      // Then, construct the blueprint by invoking its callback. This will
      // collect its top-level dependencies into the memo and produce the
      // reactive value returned by the blueprint. Assign the reactive value to
      // the hook.
      last.#reactive = blueprint.construct(last);

      // Return the hook.
      return last;
    }, `constructor for: ${blueprint.description}`);

    return HookInstance.create(memo);
  }

  readonly #description: string;
  readonly #id: number;
  #reactive: Reactive<unknown>;
  #isResource: boolean;

  private constructor(
    reactive: Reactive<unknown> | UNINITIALIZED,
    isResource: boolean,
    description: string
  ) {
    LIFETIME.on.finalize(this, () =>
      LOGGER.trace.log(`destroying instance of ${description}`)
    );

    // the UNINITIALIZED will be replaced by the caller before any methods run
    this.#reactive = reactive as Reactive<unknown>;
    this.#description = description;
    this.#isResource = isResource;
    this.#id = ++SimpleHook.#ids;
  }

  get [REACTIVE](): ReactiveInternals {
    if (this.#reactive) {
      return this.#reactive[REACTIVE];
    } else {
      return impl.UninitializedDerived.create(this.#description);
    }
  }

  get description(): string {
    return `${this.#description} (id = ${this.#id})`;
  }

  onDestroy(finalizer: IntoFinalizer): void {
    this.#isResource = true;

    LIFETIME.on.finalize(this, finalizer);
  }

  use<T>(blueprint: HookBlueprint<T>): HookInstance<T> {
    // Note: At this point, we need to *avoid* adding the dependencies of the
    // hook's returned reactive to the parent hook constructor *or* this hook
    // constructor.
    return SimpleHook.construct(blueprint, this);
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
    return this.#presentReactive.current as T;
  }

  poll(): void {
    this.current;
  }
}
