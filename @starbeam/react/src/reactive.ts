import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  Reactive,
  Abstraction,
  Cell,
  Enum,
  Frame,
  HookBlueprint,
  lifetime,
  Memo,
  SimpleHook,
  type AnyRecord,
  type InferReturn,
} from "starbeam";

class LazyState<T, Ctx> extends Enum("Initialized(T)", "Uninitialized(U)")<
  T,
  (context: Ctx) => T
> {}

class LazyValue<T, Ctx> {
  static create<T, Ctx>(initializer: (ctx: Ctx) => T): LazyValue<T, Ctx> {
    return new LazyValue(LazyState.Uninitialized(initializer));
  }

  #state: LazyState<T, Ctx>;

  private constructor(state: LazyState<T, Ctx>) {
    this.#state = state;
  }

  forContext(ctx: Ctx): T {
    return this.#state.match({
      Initialized: (value) => value,
      Uninitialized: (initializer) => {
        let value = initializer(ctx);
        this.#state = LazyState.Initialized(value);
        return value;
      },
    });
  }
}

class LastValue<T> extends Enum("Initialized(T)", "Uninitialized(U)")<
  T,
  string
> {
  assert(): T {
    return this.match({
      Initialized: (value) => value,
      Uninitialized: (description) => {
        throw Error(
          `BUG: Attempting to access an uninitialized value (${description})`
        );
      },
    });
  }

  get initialized(): T | null {
    return this.match({
      Initialized: (value) => value,
      Uninitialized: () => null,
    });
  }

  get isUninitialized(): boolean {
    return !this.isInitialized;
  }

  get isInitialized(): boolean {
    return this.match({
      Initialized: () => true,
      Uninitialized: () => false,
    });
  }
}

/**
 * The purpose of this class is to present the `Cell` interface in an object
 * that changes its referential equality whenever the internal value changes.
 *
 * It's a bridge between Starbeam's timestamp-based world and React's
 * equality-based world.
 */
class UnstableMemo<T> {
  // static create<T>(reactive: Reactive<T>): UnstableReactive<T> {
  //   return new UnstableReactive(reactive, UNINITIALIZED);
  // }

  static uninitialized<T>(callback: () => T): UnstableMemo<T> {
    return new UnstableMemo<T>(Memo(callback), LastValue.Uninitialized("T"));
  }

  static next<T>(current: UnstableMemo<T>): UnstableMemo<T> {
    let reactive = current.#reactive;

    let prev = current.#value.initialized;

    if (prev === null) {
      return current;
    }

    let next = reactive.current;

    if (prev === next) {
      return current;
    }

    return new UnstableMemo(current.#reactive, LastValue.Initialized(next));
  }

  #reactive: Reactive<T>;
  #value: LastValue<T>;

  private constructor(reactive: Reactive<T>, value: LastValue<T>) {
    this.#reactive = reactive;
    this.#value = value;
  }

  get current(): T {
    return this.#value.match({
      Uninitialized: () => {
        let value = this.#reactive.current;
        this.#value = LastValue.Initialized(value);
        return value;
      },
      Initialized: (value) => value,
    });
  }
}

class ReactiveComponent {
  static component(): ReactiveComponent {
    return new ReactiveComponent();
  }

  private constructor() {
    /** noop */
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

export function useReactive<T>(
  definition: (parent: ReactiveComponent) => () => T,
  description = `useReactive ${Abstraction.callerFrame().trimStart()}`
): T {
  const component = useLifetime();
  const notify = useNotify();

  const frame = useMemo(
    () =>
      Frame(definition(component), description)
        .subscribe(notify)
        .link(component),
    []
  );

  useEffect(() => {
    return () => lifetime.finalize(component);
  }, []);

  return frame.poll();
}

type ReactiveProps<Props extends AnyRecord> = {
  [K in keyof Props]: Reactive<Props[K]>;
};

export function starbeam<Props extends AnyRecord>(
  definition: (
    props: ReactiveProps<Props>,
    parent: ReactiveComponent
  ) => () => ReactElement,
  description = `component ${Abstraction.callerFrame().trimStart()}`
): (props: Props) => ReactElement {
  const stableProps = StableProps.empty();
  // const component = ReactiveComponent.component();

  return (props: Props) => {
    const [, setNotify] = useState({});

    const component = useLifetime();

    const reactiveProps = stableProps.update(props) as ReactiveProps<Props>;

    const frame = useMemo(
      () =>
        Frame(definition(reactiveProps, component), description)
          .subscribe(() => setNotify({}))
          .link(component),
      []
    );

    useEffect(() => {
      return () => lifetime.finalize(component);
    }, []);

    console.log(frame);
    return frame.poll();
  };
}

function useLifetime(): ReactiveComponent {
  const component = useMemo(() => ReactiveComponent.component(), []);
  useEffect(() => lifetime.finalize(component));
  return component;
}

function useNotify() {
  const [, setNotify] = useState({});
  return useMemo(() => () => setNotify({}), []);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StablePropsMap = Map<keyof any, Cell>;

class StableProps<Props> {
  static empty<Props>(): StableProps<Props> {
    return new StableProps(new Map());
  }

  readonly #props: StablePropsMap;

  constructor(props: StablePropsMap) {
    this.#props = props;
  }

  #sync(newReactProps: AnyRecord) {
    let status: "dirty" | "clean" = "clean";
    const stableProps = this.#props;

    for (let [key, newValue] of Object.entries(newReactProps)) {
      let cell = stableProps.get(key);

      if (cell) {
        if (cell.current !== newValue) {
          cell.update(newValue);
          status = "dirty";
        }
      } else {
        stableProps.set(key, Cell(newValue));
      }
    }

    for (let key of stableProps.keys()) {
      if (!(key in newReactProps)) {
        stableProps.delete(key);
        status = "dirty";
      }
    }

    return status;
  }

  update(newReactProps: AnyRecord): ReactiveProps<Props> {
    this.#sync(newReactProps);

    return Object.fromEntries(this.#props.entries()) as InferReturn;
  }
}
