import { LIFETIME, type IntoFinalizer } from "@starbeam/lifetime";
import { impl, Memo, type ReactiveValue } from "@starbeam/reactive";
import { REACTIVE, ReactiveInternals } from "@starbeam/timeline";
import { LOGGER } from "@starbeam/trace-internals";
import { expected, verified } from "@starbeam/verify";
import { is } from "../strippable/minimal.js";

export type ResourceHookConstructor<T> = (
  hook: SimpleHook<T>
) => ReactiveValue<T>;
export type DataHookConstructor<T> = () => ReactiveValue<T>;

export type HookConstructor<T> =
  | ResourceHookConstructor<T>
  | DataHookConstructor<T>;

/**
 * This class wraps the HookConstructor callback to give it extra debug
 * information. It is returned by universe.hook.
 */
export class HookBlueprint<T> {
  static create<T>(
    construct: ResourceHookConstructor<T>,
    description: string
  ): HookBlueprint<T> {
    return new HookBlueprint(construct, description);
  }

  private constructor(
    readonly construct: ResourceHookConstructor<T>,
    readonly description: string
  ) {}

  asData(): ReactiveValue<T> {
    let hook = SimpleHook.construct(this);

    // however, we need to *avoid* adding the dependencies of the hook's
    // returned reactive to the parent hook constructor *or* this hook
    // constructor.
    return Memo(
      () => hook.current.current,
      `memo for: ${this.description} instance`
    );
  }
}

export class SimpleHook<T> implements ReactiveValue<T> {
  static #ids = 0;

  static create<T>(
    reactive: ReactiveValue<T> | null,
    description: string
  ): SimpleHook<T> {
    return new SimpleHook(reactive, false, description);
  }

  static construct<T>(
    blueprint: HookBlueprint<T>
  ): ReactiveValue<ReactiveValue<T>> {
    let last: SimpleHook<T> | null = null;

    // Return a memo that will always return a hook. If the memo invalidates, it
    // will automatically finalize the last hook and construct a new hook by
    // invoking the blueprint again.
    return Memo(() => {
      if (last) {
        LIFETIME.finalize(last);
      }

      // First, construct a new hook that doesn't yet have its reactive value
      // filled in, but is ready to be used to invoke a blueprint.
      last = SimpleHook.create(null, blueprint.description);

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
  #reactive: ReactiveValue<T> | null;
  #isResource: boolean;

  private constructor(
    reactive: ReactiveValue<T> | null,
    isResource: boolean,
    description: string
  ) {
    LIFETIME.on.finalize(this, () =>
      LOGGER.trace.log(`destroying instance of ${description}`)
    );

    this.#reactive = reactive;
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

  use<T>(blueprint: HookBlueprint<T>): ReactiveValue<T> {
    let hook = SimpleHook.construct(blueprint);

    // however, we need to *avoid* adding the dependencies of the hook's
    // returned reactive to the parent hook constructor *or* this hook
    // constructor.
    return Memo(
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
