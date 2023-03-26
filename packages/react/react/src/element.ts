import type { browser } from "@domtree/flavors";
import { type DebugListener, Desc, type Description } from "@starbeam/debug";
import type { Reactive, Tagged } from "@starbeam/interfaces";
import {
  type CleanupTarget,
  LIFETIME,
  type OnCleanup,
  PUBLIC_TIMELINE,
  type Unsubscribe,
} from "@starbeam/runtime";
import {
  type Cell,
  createService,
  Factory,
  type IntoResource,
} from "@starbeam/universal";

import { ReactApp } from "./context-provider.js";
import { missingApp } from "./context-provider.js";
import { type ElementRef, type ReactElementRef, ref } from "./ref.js";
import { MountedResource } from "./use-resource.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<PropertyKey, any>;

type RefType<E extends browser.Element = browser.Element> = new (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => E;

type RefsRecord = Record<string, ElementRef>;
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

export type DebugLifecycle = (
  listener: DebugListener,
  reactive: Tagged
) => () => void;

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

  static create(
    notify: () => void,
    context: ReactApp | null,
    description: Description
  ): ReactiveElement {
    return new ReactiveElement(
      notify,
      context,
      Lifecycle.create(description),
      Refs.None(),
      description
    );
  }

  static reactivate(prev: ReactiveElement): ReactiveElement {
    return new ReactiveElement(
      prev.notify,
      prev.#context,
      Lifecycle.create(prev.#description),
      prev.#refs.fromPrev(),
      prev.#description
    );
  }

  static activate(
    notify: () => void,
    context: ReactApp | null,
    description: Description,
    prev: ReactiveElement | undefined
  ): ReactiveElement {
    if (prev) {
      return ReactiveElement.reactivate(prev);
    } else {
      return ReactiveElement.create(notify, context, description);
    }
  }

  static layout(element: ReactiveElement): void {
    Lifecycle.layout(element.#lifecycle);
  }

  static idle(element: ReactiveElement): void {
    Lifecycle.idle(element.#lifecycle);
  }

  static cleanup(element: ReactiveElement): void {
    LIFETIME.finalize(element.#lifecycle);
    element.#lifecycle = Lifecycle.create(element.#description);
  }

  static subscribe(element: ReactiveElement, reactive: Tagged): void {
    const subscription = PUBLIC_TIMELINE.on.change(reactive, element.notify);
    element.on.cleanup(subscription);
  }

  #lifecycle: Lifecycle;
  #context: ReactApp | null;
  #debugLifecycle: DebugLifecycle | null = null;
  #refs: Refs;
  readonly #description: Description;

  readonly on: OnLifecycle;

  private constructor(
    readonly notify: () => void,
    context: ReactApp | null,
    lifecycle: Lifecycle,
    refs: Refs,
    description: Description
  ) {
    this.#lifecycle = lifecycle;
    this.#context = context;
    this.on = Lifecycle.on(lifecycle, this, description);
    this.#refs = refs;
    this.#description = description;
  }

  link(child: object): Unsubscribe {
    return LIFETIME.link(this, child);
  }

  attach(lifecycle: DebugLifecycle): void {
    this.#debugLifecycle = lifecycle;
  }

  service = <T>(
    factory: IntoResource<T>,
    description?: string | Description | undefined
  ): Reactive<T> => {
    const desc = Desc("service", description);
    const context = this.#context;

    if (context === null) {
      missingApp(`service()`);
    }

    return createService(factory, desc, ReactApp.instance(context));
  };

  use = <T, Initial extends undefined>(
    factory: IntoResource<T, Initial>,
    options?: { initial?: T; description: string | Description | undefined }
  ): Reactive<T | Initial> => {
    const desc = Desc("resource", options?.description);
    const resource = MountedResource.create(options?.initial, desc);

    LIFETIME.link(this, resource);

    const create = (): void => {
      resource.create((owner) => Factory.resource(factory, owner));

      this.notify();
    };

    const unsubscribe = PUBLIC_TIMELINE.on.change(resource, this.notify);

    LIFETIME.on.cleanup(resource, unsubscribe);

    this.on.layout(create);

    return resource as Reactive<T | Initial>;
  };

  refs<R extends RefsTypes>(refs: R): RefsRecordFor<R> {
    const { refs: newRefs, record } = this.#refs.update(refs);

    this.#refs = newRefs;
    return record;
  }
}

type Callback<T = void> =
  | ((instance: T) => void)
  | ((instance: T) => () => void);

interface OnLifecycle extends OnCleanup {
  readonly cleanup: (
    finalizer: Callback,
    description?: string | Description
  ) => Unsubscribe;
  readonly idle: (
    ready: Callback,
    description?: string | Description
  ) => Unsubscribe;
  readonly layout: (
    attached: Callback,
    description?: string | Description
  ) => Unsubscribe;
}

class Lifecycle {
  static create(description: Description): Lifecycle {
    return new Lifecycle(new Set(), new Set(), description);
  }

  static layout(lifecycle: Lifecycle): void {
    for (const callback of lifecycle.#layout) {
      callback();
    }
  }

  static idle(lifecycle: Lifecycle): void {
    for (const callback of lifecycle.#idle) {
      callback();
    }
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
      idle: (idle: Callback) => {
        lifecycle.#idle.add(idle);
        return () => lifecycle.#idle.delete(idle);
      },
      layout: (layout: Callback) => {
        lifecycle.#layout.add(layout);
        return () => lifecycle.#layout.delete(layout);
      },
    } as const;
  }

  readonly #idle: Set<Callback>;
  readonly #layout: Set<Callback>;
  readonly #description: Description;

  private constructor(
    idle: Set<Callback>,
    layout: Set<Callback>,
    description: Description
  ) {
    this.#idle = idle;
    this.#layout = layout;
    this.#description = description;

    LIFETIME.link(this, idle);
    LIFETIME.link(this, layout);
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
