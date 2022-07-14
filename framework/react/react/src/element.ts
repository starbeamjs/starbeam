import type { browser } from "@domtree/flavors";
import type { Reactive } from "@starbeam/core";
import {
  type Cell,
  type CreateResource,
  CompositeInternals,
  Resource,
  Setups,
} from "@starbeam/core";
import type { Description } from "@starbeam/debug";
import { type DebugListener, callerStack } from "@starbeam/debug";
import {
  type CleanupTarget,
  type OnCleanup,
  type Pollable,
  type ReactiveInternals,
  type ReactiveProtocol,
  type Unsubscribe,
  LIFETIME,
  REACTIVE,
  TIMELINE,
} from "@starbeam/timeline";

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
  (listener: DebugListener, pollable: Pollable): () => void;
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
export class ReactiveElement implements CleanupTarget, ReactiveProtocol {
  static stack: ReactiveElement[] = [];

  static create(notify: () => void, description: Description): ReactiveElement {
    return new ReactiveElement(
      notify,
      Lifecycle.create(description),
      new Set(),
      Refs.None(),
      description
    );
  }

  static reactivate(prev: ReactiveElement): ReactiveElement {
    return new ReactiveElement(
      prev.notify,
      Lifecycle.create(prev.#description),
      prev.#pollable,
      prev.#refs.fromPrev(),
      prev.#description
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static attach(element: ReactiveElement, pollable: Pollable): void {
    if (element.#debugLifecycle) {
      const lifecycle = element.#debugLifecycle;
      const listener = pollable.attach(() => {
        invalidate();
      });
      const invalidate = lifecycle(listener, pollable);
    }
  }

  static layout(element: ReactiveElement): void {
    element.#lifecycle.layout();
  }

  static idle(element: ReactiveElement): void {
    element.#lifecycle.idle();
  }

  static cleanup(element: ReactiveElement): void {
    LIFETIME.finalize(element.#lifecycle);
    element.#lifecycle = Lifecycle.create(element.#description);
  }

  readonly #pollable: Set<(pollable: Pollable) => void>;
  #lifecycle: Lifecycle;
  #debugLifecycle: DebugLifecycle | null = null;
  #refs: Refs;
  #description: Description;

  private constructor(
    readonly notify: () => void,
    lifecycle: Lifecycle,
    renderable: Set<(pollable: Pollable) => void>,
    refs: Refs,
    description: Description
  ) {
    this.#lifecycle = lifecycle;
    this.on = Lifecycle.on(lifecycle, this);
    this.#pollable = renderable;
    this.#refs = refs;
    this.#description = description;
  }

  readonly on: OnLifecycle;

  get [REACTIVE](): ReactiveInternals {
    return this.#lifecycle[REACTIVE];
  }

  poll(): void {
    this.#lifecycle.poll();
    TIMELINE.update(this);
  }

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

type Callback<T = void> = (instance: T) => void | (() => void);

interface OnLifecycle extends OnCleanup {
  readonly cleanup: (finalizer: Callback) => Unsubscribe;
  readonly idle: (ready: Callback) => void;
  readonly layout: (attached: Callback) => void;
}

class Lifecycle implements ReactiveProtocol {
  static create(description: Description): Lifecycle {
    return new Lifecycle(Setups(description), Setups(description), description);
  }

  static on<T extends object>(lifecycle: Lifecycle, instance: T): OnLifecycle {
    LIFETIME.link(instance, lifecycle);

    return {
      cleanup: (finalizer: Callback) =>
        LIFETIME.on.cleanup(instance, finalizer),
      idle: (idle: Callback) => lifecycle.#idle.register(idle),
      layout: (layout: Callback) => lifecycle.#layout.register(layout),
    } as const;
  }

  readonly #idle: Setups;
  readonly #layout: Setups;
  readonly #description: Description;

  private constructor(idle: Setups, layout: Setups, description: Description) {
    this.#idle = idle;
    this.#layout = layout;
    this.#description = description;

    LIFETIME.link(this, idle);
    LIFETIME.link(this, layout);
  }

  get [REACTIVE]() {
    return CompositeInternals([this.#idle, this.#layout], this.#description);
  }

  idle(): void {
    this.#idle.poll();
  }

  layout(): void {
    this.#layout.poll();
  }

  poll() {
    this.#idle.poll();
    this.#layout.poll();
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
