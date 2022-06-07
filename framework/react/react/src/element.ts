import type { browser } from "@domtree/flavors";
import type { Linkable, Resource } from "@starbeam/core";
import type { Cell, Reactive } from "@starbeam/core";
import type { OnCleanup, Renderable, Unsubscribe } from "@starbeam/timeline";
import { LIFETIME } from "@starbeam/timeline";
import type { ReactElement } from "react";

import { type ElementRef, type ReactElementRef, ref } from "./ref.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<PropertyKey, any>;

interface RefType<E extends browser.Element = browser.Element> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): E;
}

type RefsRecord = Record<string, ElementRef<browser.Element>>;
type RefsTypes = Record<string, RefType>;

type RefsRecordFor<T extends RefsTypes> = {
  [P in keyof T]: ReactElementRef<InstanceType<T[P]>>;
};

type RefsEnum =
  | {
      type: "None";
    }
  | {
      type: "FromPrevious";
      value: RefsRecord;
    }
  | {
      type: "FromConstructor";
      value: RefsRecord;
    };

class Refs {
  static None(): Refs {
    return new Refs({ type: "None" });
  }

  static FromPrevious(refs: RefsRecord): Refs {
    return new Refs({
      type: "FromPrevious",
      value: refs,
    });
  }

  static FromConstructor(refs: RefsRecord): Refs {
    return new Refs({
      type: "FromConstructor",
      value: refs,
    });
  }

  #enum: RefsEnum;

  constructor(refs: RefsEnum) {
    this.#enum = refs;
  }

  get record(): RefsRecord | null {
    switch (this.#enum.type) {
      case "None":
        return null;
      case "FromPrevious":
      case "FromConstructor":
        return this.#enum.value;
    }
  }

  fromPrev(): Refs {
    switch (this.#enum.type) {
      case "None":
        return Refs.None();
      case "FromPrevious":
        return this;
      case "FromConstructor":
        return Refs.FromPrevious(this.#enum.value);
    }
  }

  update<R extends RefsTypes>(
    refs: R
  ): { refs: Refs; record: RefsRecordFor<R> } {
    switch (this.#enum.type) {
      case "None": {
        const refsRecord = Object.fromEntries(
          Object.entries(refs).map(([name, type]) => [name, ref(type)])
        );

        return {
          refs: Refs.FromConstructor(refsRecord),
          record: refsRecord as unknown as RefsRecordFor<R>,
        };
      }
      case "FromPrevious":
        return {
          refs: this,
          record: this.#enum.value as unknown as RefsRecordFor<R>,
        };
      case "FromConstructor":
        throw Error(
          "You can only call element.refs once in a Starbeam setup block"
        );
    }
  }

  isFromConstructor(): boolean {
    return this.#enum.type === "FromConstructor";
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
      new Set(),
      Refs.None()
    );
  }

  static reactivate(prev: ReactiveElement): ReactiveElement {
    return new ReactiveElement(
      prev.notify,
      Lifecycle.create(),
      prev.#renderable,
      prev.#refs.fromPrev()
    );
  }

  static setupDev(
    element: ReactiveElement,
    renderable: Renderable<ReactElement>
  ): void {
    for (const callback of element.#renderable) {
      callback(renderable);
    }
  }

  static attached(element: ReactiveElement): void {
    element.#lifecycle.attached();
  }

  static ready(elements: ReactiveElement): void {
    elements.#lifecycle.ready();
  }

  readonly #lifecycle: Lifecycle;
  readonly #renderable: Set<(renderable: Renderable<ReactElement>) => void>;
  #refs: Refs;

  private constructor(
    readonly notify: () => void,
    lifecycle: Lifecycle,
    renderable: Set<(renderable: Renderable<ReactElement>) => void>,
    refs: Refs
  ) {
    this.#lifecycle = lifecycle;
    this.on = Lifecycle.on(lifecycle, this);
    this.#renderable = renderable;
    this.#refs = refs;
  }

  readonly on: OnLifecycle;

  use<T>(resource: Linkable<Resource<T>>): Resource<T> {
    return resource.owner(this);
  }

  dev(callback: (renderable: Renderable<ReactElement>) => void) {
    this.#renderable.add(callback);
  }

  refs<R extends RefsTypes>(refs: R): RefsRecordFor<R> {
    const { refs: newRefs, record } = this.#refs.update(refs);

    this.#refs = newRefs;
    return record;
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

interface OnLifecycle extends OnCleanup {
  readonly cleanup: (finalizer: Callback) => Unsubscribe;
  readonly ready: (ready: Callback) => void;
  readonly attached: (attached: Callback) => void;
}

class Lifecycle {
  static create(): Lifecycle {
    return new Lifecycle(Callbacks.create(), Callbacks.create());
  }

  static on<T extends object>(lifecycle: Lifecycle, instance: T): OnLifecycle {
    return {
      cleanup: (finalizer: Callback) =>
        LIFETIME.on.cleanup(instance, finalizer),
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
