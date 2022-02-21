import { useCallback, useDebugValue, useState, type ReactElement } from "react";
import {
  assert,
  Cell,
  exhaustive,
  expected,
  getDescription,
  HookBlueprint,
  is,
  lifetime,
  LOGGER,
  Memo,
  Reactive,
  SimpleHook,
  subscribe,
  verify,
  type AnyIndex,
  type AnyKey,
  type AnyRecord,
  type InferReturn,
} from "starbeam";
import { useInstance } from "./instance.js";

export class ReactiveComponent {
  static create(notify: () => void): ReactiveComponent {
    return new ReactiveComponent(notify);
  }

  #notify: () => void;

  private constructor(notify: () => void) {
    this.#notify = notify;
  }

  get notify() {
    return () => {
      this.#notify();
    };
  }

  updateNotify(notify: () => void): void {
    this.#notify = notify;
  }

  useComponentManager<Props, C extends ComponentManager<unknown, object>>(
    manager: C,
    props: Props
  ): C extends ComponentManager<Props, infer Instance> ? Instance : never {
    let instance = useInstance(() => {
      return manager.create(this, props);
    }).update((instance) => manager.update(instance, props));

    lifetime.link(this, instance);

    return instance as InferReturn;
  }

  readonly on = {
    finalize: (finalizer: () => void) => lifetime.on.finalize(this, finalizer),
  } as const;

  use<T>(blueprint: HookBlueprint<T>): Reactive<T>;
  use<T>(callback: (parent: ReactiveComponent) => Reactive<T>): Reactive<T>;
  use<T>(
    blueprint: HookBlueprint<T> | ((parent: ReactiveComponent) => Reactive<T>)
  ): Reactive<T> {
    let normalized =
      typeof blueprint === "function"
        ? HookBlueprint.create(
            () => blueprint(this),
            `(anonymous hook from useReactive)`
          )
        : blueprint;

    let hook = SimpleHook.construct(normalized);

    lifetime.link(this, hook);

    // however, we need to *avoid* adding the dependencies of the hook's
    // returned reactive to the parent hook constructor *or* this hook
    // constructor.
    return Memo(
      () => hook.current.current,
      `memo for: ${normalized.description} instance`
    );
  }
}

export type ReactiveProps<Props> = {
  [K in keyof Props]: K extends `$${string}` | `children`
    ? Props[K]
    : Reactive<Props[K]>;
};

type ReactProps<Props> = {
  [K in keyof Props]: K extends `children` | `$${string}`
    ? Props[K]
    : Props[K] extends Reactive<infer T>
    ? T | Reactive<T>
    : never;
};

type InternalReactiveProps<Props extends AnyRecord> = {
  [K in keyof Props]: K extends `children` | `$${string}`
    ? Props[K]
    : Cell<Props[K]>;
};

export function Component<Props>(
  definition: (props: Props, parent: ReactiveComponent) => () => ReactElement,
  description = getDescription(definition)
): (props: ReactProps<Props>) => ReactElement {
  const component = (props: ReactProps<Props>) => {
    useDebugValue(description);
    const component = useStableComponent();

    LOGGER.trace.log({
      in: "Component#parent",
      component,
      notify: component.notify,
    });

    const stableProps = component.useComponentManager(
      STABLE_COMPONENT,
      props
    ) as StableProps<Props>;

    let subscription = useInstance(() =>
      subscribe(
        Memo(definition(stableProps.reactive as Props, component)),
        component.notify,
        description
      )
    ).instance;

    // idempotent
    lifetime.link(component, subscription);

    return subscription.poll().value;
  };

  Object.defineProperty(component, "displayName", {
    enumerable: true,
    writable: false,
    configurable: true,
    value: description,
  });

  return component;
}

interface ComponentManager<Props, Instance extends object> {
  create(component: ReactiveComponent, props: Props): Instance;
  update(instance: Instance, props: Props): void;
}

class StableComponent<Props>
  implements ComponentManager<Props, StableProps<Props>>
{
  create<P extends Props>(
    component: ReactiveComponent,
    props: P
  ): StableProps<P> {
    return StableProps.from(props);
  }

  update<P extends Props>(instance: StableProps<P>, props: P): void {
    instance.update(props);
  }
}

export const STABLE_COMPONENT = new StableComponent();

export function useStableComponent(): ReactiveComponent {
  const component = useInstance(() =>
    ReactiveComponent.create(() => null)
  ).instance;

  const [, setNotify] = useState({});

  const notify = useCallback(() => setNotify({}), [setNotify]);
  component.updateNotify(notify);

  return component;
}

export class StableProps<Props> {
  static from<Props>(props: Props): StableProps<Props> {
    let reactive = Object.fromEntries(
      Object.entries(props).map(([key, value]) => initialPropEntry(key, value))
    ) as InternalReactiveProps<Props>;

    return new StableProps(reactive);
  }

  readonly #reactive: InternalReactiveProps<Props>;

  constructor(reactive: InternalReactiveProps<Props>) {
    this.#reactive = reactive;
  }

  #sync(newReactProps: AnyRecord) {
    const stableProps = this.#reactive;

    for (let [key, newValue] of Object.entries(newReactProps)) {
      updateProp(stableProps, key, newValue);
    }

    for (let key of Object.keys(stableProps)) {
      if (!(key in newReactProps)) {
        delete stableProps[key as keyof Props];
      }
    }
  }

  update(newReactProps: AnyRecord): void {
    this.#sync(newReactProps);
  }

  get reactive(): ReactiveProps<Props> {
    return this.#reactive;
  }
}

// TODO: `$`-prefixed props should be stable and a change to `children`
// should result in a re-render. But we may not want to require
// useCallback... probably?
function isPassthruProp(key: AnyKey): boolean {
  verify(
    key,
    is(
      (value: unknown): value is string | symbol =>
        typeof value === "string" || typeof value === "symbol"
    )
  );

  if (typeof key === "symbol") {
    return true;
  } else if (typeof key === "string") {
    return key.startsWith("$") || key === "children";
  } else {
    exhaustive(key);
  }
}

function initialPropEntry(key: AnyKey, value: unknown) {
  if (isPassthruProp(key)) {
    return [key, value];
  } else if (Reactive.is(value)) {
    return [key, value];
  } else {
    return [key, Cell(value)];
  }
}

// TODO: `$`-prefixed props should be stable and a change to `children`
// should result in a re-render. But we may not want to require
// useCallback... probably?
function updateProp(
  props: AnyRecord<Cell | unknown>,
  key: AnyKey,
  newValue: unknown
) {
  if (isPassthruProp(key)) {
    props[key as AnyIndex] = newValue;
  } else if (key in props) {
    const existing = props[key as AnyIndex];

    if (Reactive.is(newValue)) {
      assert(
        existing === newValue,
        "When passing a reactive value to a Starbeam component, you must pass the same Reactive every time"
      );
      return;
    }

    verify(
      existing,
      is(Cell.is),
      expected(`an existing reactive prop`)
        .toBe(`a cell`)
        .when(`a prop isn't 'children', prefixed with '$' or a symbol`)
    );

    const existingValue = existing.current;

    if (existingValue !== newValue) {
      existing.update(newValue);
    }
  } else {
    props[key as AnyIndex] = Cell(newValue);
  }
}
