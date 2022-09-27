import type { browser } from "@domtree/flavors";
import {
  type Cell,
  type ResourceBlueprint,
  Resource,
  Setups,
  DelegateInternals,
} from "@starbeam/core";
import {
  type DebugListener,
  type Description,
  callerStack,
  descriptionFrom,
  Stack,
} from "@starbeam/debug";
import {
  type CleanupTarget,
  type OnCleanup,
  type Reactive,
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
  (listener: DebugListener, reactive: ReactiveProtocol): () => void;
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
      Refs.None(),
      description
    );
  }

  static reactivate(prev: ReactiveElement): ReactiveElement {
    return new ReactiveElement(
      prev.notify,
      Lifecycle.create(prev.#description),
      prev.#refs.fromPrev(),
      prev.#description
    );
  }

  // // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // static attach(element: ReactiveElement, subscription: Subscription): void {
  //   if (element.#debugLifecycle) {
  //     const lifecycle = element.#debugLifecycle;
  //     const listener = subscription.attach(() => {
  //       invalidate();
  //     });
  //     const invalidate = lifecycle(listener, pollable);
  //   }
  // }

  static layout(element: ReactiveElement): void {
    element.#lifecycle.layout.read();
    TIMELINE.update(element);
  }

  static idle(element: ReactiveElement): void {
    element.#lifecycle.idle.read();
    TIMELINE.update(element);
  }

  static cleanup(element: ReactiveElement): void {
    LIFETIME.finalize(element.#lifecycle);
    element.#lifecycle = Lifecycle.create(element.#description);
  }

  #lifecycle: Lifecycle;
  #debugLifecycle: DebugLifecycle | null = null;
  #refs: Refs;
  readonly #description: Description;
  readonly [REACTIVE]: ReactiveInternals;

  private constructor(
    readonly notify: () => void,
    lifecycle: Lifecycle,
    refs: Refs,
    description: Description
  ) {
    this.#lifecycle = lifecycle;
    this.on = Lifecycle.on(lifecycle, this, description);
    this.#refs = refs;
    this.#description = description;

    this[REACTIVE] = DelegateInternals([lifecycle.layout, lifecycle.idle], {
      description,
    });
  }

  readonly on: OnLifecycle;

  link(child: object): Unsubscribe {
    return LIFETIME.link(this, child);
  }

  attach(lifecycle: DebugLifecycle): void {
    this.#debugLifecycle = lifecycle;
  }

  use<T>(
    resource: ResourceBlueprint<T>,
    _caller: Stack = callerStack()
  ): Resource<T> {
    const r = resource.create({ owner: this });

    this.on.layout(() => Resource.setup(r));

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
  readonly cleanup: (
    finalizer: Callback,
    description?: string | Description
  ) => Unsubscribe;
  readonly idle: (ready: Callback, description?: string | Description) => void;
  readonly layout: (
    attached: Callback,
    description?: string | Description
  ) => void;
}

class Lifecycle {
  static create(description: Description): Lifecycle {
    return new Lifecycle(Setups(description), Setups(description), description);
  }

  static on<T extends object>(
    lifecycle: Lifecycle,
    instance: T,
    _elementDescription: Description
  ): OnLifecycle {
    LIFETIME.link(instance, lifecycle);

    return {
      cleanup: (finalizer: Callback) =>
        LIFETIME.on.cleanup(instance, finalizer),
      idle: (idle: Callback, description?: string | Description) => {
        const desc = descriptionFrom({
          type: "resource",
          api: {
            package: "@starbeam/react",
            name: "ReactiveElement",
            method: {
              name: "on.idle",
              type: "instance",
            },
          },
          fromUser: description ?? "on.idle",
        });
        return lifecycle.#idle.register(idle, desc);
      },
      layout: (layout: Callback, description?: string | Description) => {
        const desc = descriptionFrom({
          type: "resource",
          api: {
            package: "@starbeam/react",
            name: "ReactiveElement",
            method: {
              name: "on.layout",
              type: "instance",
            },
          },
          fromUser: description ?? "on.layout",
        });

        return lifecycle.#layout.register(layout, desc);
      },
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

  get idle(): Reactive<void> {
    return this.#idle.setups;
  }

  get layout(): Reactive<void> {
    return this.#layout.setups;
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
