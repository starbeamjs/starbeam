import type { browser } from "@domtree/flavors";
import {
  HookBlueprint,
  HookInstance,
  lifetime,
  SimpleHook,
} from "@starbeam/core";
import { Stack } from "@starbeam/debug-utils";
import {
  assert,
  type AnyRecord,
  type InferReturn,
} from "@starbeam/fundamental";
import { Cell, type Reactive } from "@starbeam/reactive";
import { Abstraction } from "@starbeam/trace-internals";
import { Enum } from "@starbeam/utils";
import {
  getElement,
  ref,
  reifyModifier,
  type ElementRef,
  type Modifier,
  type ReactElementRef,
} from "./modifier.js";

type IntoReactive<T> = T extends Reactive<unknown> ? T : Reactive<T>;

interface RefType<E extends browser.Element = browser.Element> {
  new (...args: any[]): E;
}

type RefsRecord = Record<string, ElementRef<browser.Element>>;
type RefsTypes = Record<string, RefType>;

type RefsRecordFor<T extends RefsTypes> = {
  [P in keyof T]: ReactElementRef<InstanceType<T[P]>>;
};

class Refs extends Enum(
  "None",
  "FromPrevious(T)",
  "FromConstructor(T)"
)<RefsRecord> {
  get record(): RefsRecord | null {
    return this.match({
      None: () => null,
      FromConstructor: (value) => value,
      FromPrevious: (value) => value,
    });
  }

  fromPrev(): Refs {
    return this.match({
      None: () => Refs.None(),
      FromConstructor: (value) => Refs.FromPrevious(value),
      FromPrevious: () => this,
    });
  }
}

/**
 * A {@link ReactiveElement} is a stable representation of a
 * {@link ReactElement}.
 *
 * Compared to {@link ReactElement}:
 *
 * - Instantiation:
 *   - A `ReactElement` is created once per React render execution.
 *   - A `ReactiveElement` is created once per React activation
 * - Finalization:
 *   - A `ReactElement` is never finalized
 *   - A `ReactiveElement` is finalized on React deactivation
 *
 * {@link ReactiveElement} is primarily used as part of the
 * {@link useReactiveElement} API (when a {@link useReactElement} definition is
 * instantiated, it is passed a {@link ReactiveElement}).
 */
export class ReactiveElement {
  static create(notify: () => void): ReactiveElement {
    return new ReactiveElement(
      notify,
      Lifecycle.create(),
      Elements.create(),
      Refs.None()
    );
  }

  static reactivate(prev: ReactiveElement): ReactiveElement {
    return new ReactiveElement(
      prev.notify,
      Lifecycle.create(),
      Elements.create(),
      prev.#refs.fromPrev()
    );
  }

  static attached(element: ReactiveElement): void {
    element.#lifecycle.attached();
    element.#modifiers.populate();
  }

  static ready(elements: ReactiveElement): void {
    elements.#lifecycle.ready();
  }

  readonly #lifecycle: Lifecycle;
  readonly #modifiers: Elements;
  #refs: Refs;

  private constructor(
    readonly notify: () => void,
    lifecycle: Lifecycle,
    elements: Elements,
    refs: Refs
  ) {
    this.#lifecycle = lifecycle;
    this.on = Lifecycle.on(lifecycle, this);
    this.#modifiers = elements;
    this.#refs = refs;
  }

  readonly on: OnLifecycle;

  refs<R extends RefsTypes>(refs: R): RefsRecordFor<R> {
    assert(
      this.#refs.matches("any", ["FromPrevious", "None"]),
      `You can only call element.refs once in a Starbeam setup block`
    );

    if (this.#refs.matches("FromPrevious")) {
      return this.#refs.record as InferReturn;
    }

    const refsRecord = Object.fromEntries(
      Object.entries(refs).map(([name, type]) => [name, ref(type)])
    );

    this.#refs = Refs.FromConstructor(refsRecord);

    return refsRecord as InferReturn;
  }

  use<T>(blueprint: HookBlueprint<T>): Reactive<T>;
  use<T>(callback: (parent: ReactiveElement) => T): IntoReactive<T>;
  use(
    blueprint:
      | HookBlueprint<unknown>
      | ((parent: ReactiveElement) => Reactive<unknown>),
    description = Stack.describeCaller()
  ): Reactive<unknown> {
    const normalized = HookBlueprint.is(blueprint)
      ? blueprint
      : HookBlueprint.create(() => blueprint(this), description);

    return normalized.asData(this);
  }

  useModifier<T, E extends browser.Element>(
    ref: ElementRef<E>,
    Modifier: Modifier<E, T>,
    description = Abstraction.callerFrame()
  ): Cell<HookInstance<T> | null> {
    const modifier: Cell<HookInstance<T> | null> = Cell(null);

    this.#modifiers.insert(
      ref as ElementRef,
      (element: browser.Element): void => {
        const blueprint = reifyModifier(Modifier, element as E, description);
        const hook = SimpleHook.construct(blueprint, this);
        modifier.set(hook);
      }
    );

    return modifier;
  }
}

type Callback<T = void> = (instance: T) => void;

class Callbacks<T = void> {
  static create<T>(): Callbacks<T> {
    return new Callbacks(new Set());
  }

  readonly #callbacks: Set<(instance: T) => void>;

  private constructor(callbacks: Set<() => void>) {
    this.#callbacks = callbacks;
  }

  add(callback: Callback<T>): void {
    this.#callbacks.add(callback);
  }

  invoke(instance: T): void {
    for (const callback of this.#callbacks) {
      callback(instance);
    }
  }
}

interface OnLifecycle {
  readonly finalize: (finalizer: Callback) => void;
  readonly ready: (ready: Callback) => void;
  readonly attached: (attached: Callback) => void;
}

class Lifecycle {
  static create(): Lifecycle {
    return new Lifecycle(Callbacks.create(), Callbacks.create());
  }

  static on<T extends object>(lifecycle: Lifecycle, instance: T): OnLifecycle {
    return {
      finalize: (finalizer: Callback) =>
        lifetime.on.finalize(instance, finalizer),
      ready: (ready: Callback) => lifecycle.#ready.add(ready),
      attached: (attached: Callback) => lifecycle.#attached.add(attached),
    } as const;
  }

  readonly #ready: Callbacks;
  readonly #attached: Callbacks;

  private constructor(ready: Callbacks, attached: Callbacks) {
    this.#ready = ready;
    this.#attached = attached;
  }

  ready(): void {
    this.#ready.invoke();
  }

  attached(): void {
    this.#attached.invoke();
  }
}

type RefMap = LazyMap<ElementRef, Callbacks<browser.Element>>;

class LazyMap<K, V> implements Iterable<[K, V]> {
  static create<K, V>(initialize: () => V): LazyMap<K, V> {
    return new LazyMap(new Map(), initialize);
  }

  readonly #map: Map<K, V>;
  readonly #initialize: () => V;

  private constructor(map: Map<K, V>, initialize: () => V) {
    this.#map = map;
    this.#initialize = initialize;
    // this.entries = map[Symbol.iterator];
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.#map[Symbol.iterator]();
  }

  get entries(): IterableIterator<[K, V]> {
    return this.#map.entries();
  }

  get(key: K): V {
    let value = this.#map.get(key);

    if (!value) {
      value = this.#initialize();
      this.#map.set(key, value);
    }

    return value;
  }

  upsert(key: K, updater: (value: V) => V | void): V {
    const value = this.get(key);
    const updated = updater(value);

    if (updated !== undefined) {
      this.#map.set(key, updated);
    }

    return value;
  }
}

class Elements {
  static create(): Elements {
    return new Elements(
      LazyMap.create(() => Callbacks.create<browser.Element>())
    );
  }

  readonly #elements: RefMap;

  private constructor(elements: RefMap) {
    this.#elements = elements;
  }

  insert(
    element: ElementRef<browser.Element>,
    callback: Callback<browser.Element>
  ): void {
    this.#elements.upsert(element, (callbacks) => callbacks.add(callback));
    console.log(this.#elements);
  }

  populate(): void {
    for (const [ref, callbacks] of this.#elements) {
      const element = getElement(ref);
      callbacks.invoke(element);
    }
  }
}

export type ReactiveProps<Props> = {
  [K in keyof Props]: K extends `$${string}` | `children`
    ? Props[K]
    : Reactive<Props[K]>;
};

export type InternalReactiveProps<Props extends AnyRecord> = {
  [K in keyof Props]: K extends `children` | `$${string}`
    ? Props[K]
    : Cell<Props[K]>;
};

export const SUBSCRIPTION = Symbol("SUBSCRIPTION");
export const STABLE_PROPS = Symbol("STABLE_PROPS");
