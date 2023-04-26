import type { browser } from "@domtree/flavors";
import type { Description, Reactive, Tagged } from "@starbeam/interfaces";
import { DEBUG, Formula } from "@starbeam/reactive";
import type { IntoResourceBlueprint, Resource } from "@starbeam/resource";
import * as resource from "@starbeam/resource";
import { CONTEXT, render, RUNTIME, type Unsubscribe } from "@starbeam/runtime";
import { service } from "@starbeam/service";
import { Cell } from "@starbeam/universal";

import { missingApp, ReactApp } from "../app.js";
import { type ElementRef, type ReactElementRef, ref } from "./ref.js";

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

type DebugListener = unknown;

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
export class ReactiveElement {
  static stack: ReactiveElement[] = [];

  static create(
    notify: () => void,
    context: ReactApp | null,
    description: Description | undefined
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
    description: Description | undefined,
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
    RUNTIME.finalize(element.#lifecycle);
    element.#lifecycle = Lifecycle.create(element.#description);
  }

  static subscribe(element: ReactiveElement, reactive: Tagged): void {
    element.#render(reactive);
  }

  #lifecycle: Lifecycle;
  #context: ReactApp | null;
  #debugLifecycle: DebugLifecycle | null = null;
  #refs: Refs;
  readonly #description: Description | undefined;

  readonly on: OnLifecycle;

  private constructor(
    readonly notify: () => void,
    context: ReactApp | null,
    lifecycle: Lifecycle,
    refs: Refs,
    description: Description | undefined
  ) {
    this.#lifecycle = lifecycle;
    this.#context = context;
    this.on = Lifecycle.on(lifecycle, this, description);
    this.#refs = refs;
    this.#description = description;
  }

  #render(reactive: Tagged): void {
    this.on.cleanup(render(reactive, this.notify));
  }

  link(child: object): Unsubscribe {
    return RUNTIME.link(this, child);
  }

  attach(lifecycle: DebugLifecycle): void {
    this.#debugLifecycle = lifecycle;
  }

  service = <T>(
    blueprint: IntoResourceBlueprint<T>,
    description?: string | Description | undefined
  ): Resource<T> => {
    const desc = DEBUG?.Desc("service", description, "UseSetup.service");
    const context = this.#context;

    if (context === null) {
      missingApp(`service()`);
    }

    CONTEXT.app = ReactApp.instance(context);

    return service(blueprint, { description: desc });
  };

  readonly use = <T>(
    factory: IntoResourceBlueprint<T>,
    options?: { initial?: T }
  ): Reactive<T | undefined> => {
    return internalUseResource(
      this,
      {
        notify: this.notify,
        render: (reactive) => this.on.cleanup(render(reactive, this.notify)),
        on: {
          layout: (callback) => {
            if (!callback) return;
            return this.on.layout(() => void callback(factory));
          },
          cleanup: this.on.cleanup,
        },
      },
      options?.initial
    );
  };

  refs<R extends RefsTypes>(refs: R): RefsRecordFor<R> {
    const { refs: newRefs, record } = this.#refs.update(refs);

    this.#refs = newRefs;
    return record;
  }
}

interface ResourceHost<T> {
  readonly notify: () => void;
  readonly render: (reactive: Tagged) => void;
  readonly on: {
    layout: (callback: undefined | ((value: T) => void)) => Unsubscribe;
    cleanup: (callback: undefined | (() => void)) => Unsubscribe;
  };
}

export function internalUseResource<T>(
  lifetime: object,
  host: ResourceHost<IntoResourceBlueprint<T>>,
  initial: T | undefined
): Reactive<T | undefined> {
  const resourceCell = Cell(undefined as undefined | Resource<T>);

  const create = (blueprint: IntoResourceBlueprint<T>): void => {
    resourceCell.set(resource.use(blueprint, { lifetime }));

    host.notify();
  };

  host.on.layout(create);

  const formula = Formula(() => {
    return resourceCell.current?.read() ?? initial;
  });

  host.on.cleanup(render(formula, host.notify));

  return formula;
}

type Callback<T = void> =
  | ((instance: T) => void)
  | ((instance: T) => () => void);

interface OnLifecycle {
  readonly cleanup: (
    finalizer: Callback | undefined,
    description?: string | Description
  ) => Unsubscribe | undefined;
  readonly idle: (
    ready: Callback | undefined,
    description?: string | Description
  ) => Unsubscribe | undefined;
  readonly layout: (
    attached: Callback | undefined,
    description?: string | Description
  ) => Unsubscribe | undefined;
}

class Lifecycle {
  static create(description: Description | undefined): Lifecycle {
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
    _elementDescription: Description | undefined
  ): OnLifecycle {
    RUNTIME.link(instance, lifecycle);

    return {
      cleanup: (finalizer: Callback | undefined) => {
        if (!finalizer) return;
        return RUNTIME.onFinalize(instance, finalizer);
      },
      idle: (idle: Callback | undefined) => {
        if (!idle) return;
        lifecycle.#idle.add(idle);
        return () => lifecycle.#idle.delete(idle);
      },
      layout: (layout: Callback | undefined) => {
        if (!layout) return;
        lifecycle.#layout.add(layout);
        return () => lifecycle.#layout.delete(layout);
      },
    } as const;
  }

  readonly #idle: Set<Callback>;
  readonly #layout: Set<Callback>;
  readonly #description: Description | undefined;

  private constructor(
    idle: Set<Callback>,
    layout: Set<Callback>,
    description: Description | undefined
  ) {
    this.#idle = idle;
    this.#layout = layout;
    this.#description = description;

    RUNTIME.link(this, idle);
    RUNTIME.link(this, layout);
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
