import type { browser } from "@domtree/flavors";
import {
  type Cell,
  type CreateResource,
  type Reactive,
  Resource,
} from "@starbeam/core";
import { type DebugListener, callerStack } from "@starbeam/debug";
import type {
  CleanupTarget,
  OnCleanup,
  Renderable,
  Unsubscribe,
} from "@starbeam/timeline";
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

  #refs: RefsEnum;

  constructor(refs: RefsEnum) {
    this.#refs = refs;
  }

  get record(): RefsRecord | null {
    switch (this.#refs.type) {
      case "None":
        return null;
      case "FromPrevious":
      case "FromConstructor":
        return this.#refs.value;
    }
  }

  fromPrev(): Refs {
    switch (this.#refs.type) {
      case "None":
        return Refs.None();
      case "FromPrevious":
        return this;
      case "FromConstructor":
        return Refs.FromPrevious(this.#refs.value);
    }
  }

  update<R extends RefsTypes>(
    refs: R
  ): { refs: Refs; record: RefsRecordFor<R> } {
    switch (this.#refs.type) {
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
          record: this.#refs.value as unknown as RefsRecordFor<R>,
        };
      case "FromConstructor":
        throw Error(
          "You can only call element.refs once in a Starbeam setup block"
        );
    }
  }

  isFromConstructor(): boolean {
    return this.#refs.type === "FromConstructor";
  }
}

export interface DebugLifecycle {
  (listener: DebugListener, renderable: Renderable<unknown>): () => void;
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
export class ReactiveElement implements CleanupTarget {
  static stack: ReactiveElement[] = [];

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static attach(element: ReactiveElement, renderable: Renderable<any>): void {
    if (element.#debugLifecycle) {
      const lifecycle = element.#debugLifecycle;
      const listener = renderable.attach(() => {
        invalidate();
      });
      const invalidate = lifecycle(listener, renderable);
    }
  }

  static layout(element: ReactiveElement): void {
    element.#lifecycle.layout();
  }

  static idle(elements: ReactiveElement): void {
    elements.#lifecycle.idle();
  }

  readonly #lifecycle: Lifecycle;
  readonly #renderable: Set<(renderable: Renderable<ReactElement>) => void>;
  #debugLifecycle: DebugLifecycle | null = null;
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

  link(child: object): Unsubscribe {
    return LIFETIME.link(this, child);
  }

  attach(lifecycle: DebugLifecycle): void {
    this.#debugLifecycle = lifecycle;
  }

  use<T>(resource: CreateResource<T>, caller = callerStack()): Resource<T> {
    const r = resource.create({ owner: this });

    this.on.layout(() => Resource.setup(r, caller));

    return r;
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
  readonly idle: (ready: Callback) => void;
  readonly layout: (attached: Callback) => void;
}

class Lifecycle {
  static create(): Lifecycle {
    return new Lifecycle(Callbacks.create(), Callbacks.create());
  }

  static on<T extends object>(lifecycle: Lifecycle, instance: T): OnLifecycle {
    return {
      cleanup: (finalizer: Callback) =>
        LIFETIME.on.cleanup(instance, finalizer),
      idle: (ready: Callback) => lifecycle.#idle.add(ready),
      layout: (attached: Callback) => lifecycle.#layout.add(attached),
    } as const;
  }

  readonly #idle: Callbacks;
  readonly #layout: Callbacks;

  private constructor(ready: Callbacks, attached: Callbacks) {
    this.#idle = ready;
    this.#layout = attached;
  }

  idle(): void {
    this.#idle.invoke();
  }

  layout(): void {
    this.#layout.invoke();
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
