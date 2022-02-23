import { UNINITIALIZED } from "@starbeam/core";
import { useRef } from "react";

class InstanceState<T> {
  static forInstance<T>(instance: T): InstanceState<T> {
    return new InstanceState(instance);
  }

  readonly #instance: T;

  private constructor(instance: T) {
    this.#instance = instance;
  }

  get instance(): T {
    return this.#instance;
  }

  update(updater: (instance: T) => void): T {
    updater(this.#instance);

    return this.#instance;
  }
}

export interface NormalizedUseInstanceOptions<T> {
  readonly initial: (notify: () => void) => T;
  readonly update?: (value: T, notify: () => void) => void;
  readonly finalize?: (value: T) => void;
}

export type UseInstanceArg<T> = () => T;

export function useInstance<T>(initialize: () => T): InstanceState<T> {
  const ref = useRef<UNINITIALIZED | InstanceState<T>>(UNINITIALIZED);

  let instance: T;

  if (ref.current === UNINITIALIZED) {
    instance = initialize();
    ref.current = InstanceState.forInstance(instance);
  }

  return ref.current;
}
