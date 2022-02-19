import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  Abstraction,
  Cell,
  HookBlueprint,
  lifetime,
  Memo,
  Reactive,
  SimpleHook,
  subscribe,
  UNINITIALIZED,
  type AnyRecord,
  type InferReturn,
} from "starbeam";
import { useInstance } from "./instance.js";

export class ReactiveComponent {
  static create(notify: () => void): ReactiveComponent {
    return new ReactiveComponent(notify);
  }

  #updatedNotify = 0;
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
    let instance = useInstance(this, () => {
      return manager.create(this, props);
    }).update({
      finalize: true,
      update: (instance) => {
        manager.update(instance, props);
      },
    });

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

type ReactiveProps<Props extends AnyRecord> = {
  [K in keyof Props]: Reactive<Props[K]>;
};

type InternalReactiveProps<Props extends AnyRecord> = {
  [K in keyof Props]: Cell<Props[K]>;
};

export function starbeam<Props extends AnyRecord>(
  definition: (
    props: ReactiveProps<Props>,
    parent: ReactiveComponent
  ) => () => ReactElement,
  description = `component ${Abstraction.callerFrame().trimStart()}`
): (props: Props) => ReactElement {
  return (props: Props) => {
    const component = useStableComponent();

    const stableProps = component.useComponentManager(
      STABLE_COMPONENT,
      props
    ) as StableProps<Props>;

    let subscription = useInstance(component, () =>
      subscribe(
        Memo(definition(stableProps.reactive, component)),
        component.notify,
        description
      )
    ).instance;

    // idempotent
    lifetime.link(component, subscription);

    return subscription.poll().value;
  };
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

const STABLE_COMPONENT = new StableComponent();

function useStableComponent(): ReactiveComponent {
  const ref = useRef<UNINITIALIZED | ReactiveComponent>(UNINITIALIZED);
  const isFirstTime = ref.current === UNINITIALIZED;

  const [, setNotify] = useState({});

  if (ref.current === UNINITIALIZED) {
    ref.current = ReactiveComponent.create(() => setNotify({}));
  }

  let instance: ReactiveComponent = ref.current;

  useEffect(() => {
    if (isFirstTime) {
      return () => lifetime.finalize(instance);
    }

    return;
  }, []);

  useLayoutEffect(() => {
    instance.updateNotify(() => setNotify({}));
  });

  return ref.current;
}

export class StableProps<Props> {
  static from<Props>(props: Props): StableProps<Props> {
    let reactive = Object.fromEntries(
      Object.entries(props).map(([key, value]) => [key, Cell(value)])
    ) as InternalReactiveProps<Props>;

    return new StableProps(reactive);
  }

  readonly #reactive: InternalReactiveProps<Props>;

  constructor(reactive: InternalReactiveProps<Props>) {
    this.#reactive = reactive;
  }

  #sync(newReactProps: AnyRecord) {
    let status: "dirty" | "clean" = "clean";
    const stableProps = this.#reactive;

    for (let [key, newValue] of Object.entries(newReactProps)) {
      let cell = stableProps[key as keyof Props];

      if (cell) {
        if (cell.current !== newValue) {
          cell.update(newValue);
          status = "dirty";
        }
      } else {
        stableProps[key as keyof Props] = Cell(newValue);
      }
    }

    for (let key of Object.keys(stableProps)) {
      if (!(key in newReactProps)) {
        delete stableProps[key as keyof Props];
        status = "dirty";
      }
    }

    return status;
  }

  update(newReactProps: AnyRecord): void {
    this.#sync(newReactProps);
  }

  get reactive(): ReactiveProps<Props> {
    return this.#reactive;
  }
}
