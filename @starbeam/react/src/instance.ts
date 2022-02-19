import { useRef } from "react";
import { isObject, lifetime, UNINITIALIZED } from "starbeam";
import type { ReactiveComponent } from "./reactive.js";

export interface UpdateOptions<T> {
  update?: (instance: T, notify: () => void) => void;
  finalize?: true | ((instance: T) => void) | (() => void);
}

type UpdateCallback<T> = (instance: T) => void;

function normalizeUpdate<T>(
  component: ReactiveComponent,
  instance: T,
  options: UpdateOptions<T>
): UpdateCallback<T> | undefined {
  const { finalize, update } = options;

  if (finalize && isObject(instance)) {
    lifetime.link(component, instance);

    if (typeof finalize === "function") {
      lifetime.on.finalize(instance, () => finalize(instance));
    }
  }

  return update ? (instance) => update(instance, component.notify) : undefined;
}

export interface UseInstanceOptions<T> {
  (notify: () => void): UpdateOptions<T>;
}

class InstanceState<T> {
  static forInstance<T>(
    component: ReactiveComponent,
    instance: T
  ): InstanceState<T> {
    return new InstanceState(component, instance);
  }

  static getUpdater<T>(state: InstanceState<T>): UpdateCallback<T> | undefined {
    return state.#updater;
  }

  readonly #component: ReactiveComponent;
  readonly #instance: T;
  #updater: UpdateCallback<T> | undefined;

  private constructor(component: ReactiveComponent, instance: T) {
    this.#component = component;
    this.#instance = instance;
  }

  get instance(): T {
    return this.#instance;
  }

  update(options: UpdateOptions<T>): T {
    if (this.#updater) {
      return this.#instance;
    }

    this.#updater = normalizeUpdate(this.#component, this.#instance, options);

    return this.#instance;
  }
}

export interface NormalizedUseInstanceOptions<T> {
  readonly initial: (notify: () => void) => T;
  readonly update?: (value: T, notify: () => void) => void;
  readonly finalize?: (value: T) => void;
}

export type UseInstanceArg<T> = (() => T) | UseInstanceOptions<T>;

export function useInstance<T>(
  component: ReactiveComponent,
  initialize: (notify: () => void) => T
): InstanceState<T> {
  const ref = useRef<UNINITIALIZED | InstanceState<T>>(UNINITIALIZED);

  let instance: T;

  if (ref.current === UNINITIALIZED) {
    instance = initialize(component.notify);
    ref.current = InstanceState.forInstance(component, instance);
  } else {
    let state = ref.current;
    instance = state.instance;
    let updater = InstanceState.getUpdater(state);

    if (updater) {
      updater(instance);
    }
  }

  return ref.current;
}
