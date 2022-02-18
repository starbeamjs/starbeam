import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  Abstraction,
  Cell,
  Frame,
  HookBlueprint,
  lifetime,
  Memo,
  Reactive,
  SimpleHook,
  type AnyRecord,
  type InferReturn,
} from "starbeam";

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
