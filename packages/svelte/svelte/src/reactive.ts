import { Formula } from "@starbeam/reactive";
import { RUNTIME } from "@starbeam/runtime";
import { createSubscriber } from "svelte/reactivity";

export interface StarbeamValue<T> {
  readonly current: T;
}

export function fromStarbeam<T>(compute: () => T): StarbeamValue<T> {
  const formula = Formula(compute);
  const subscribe = createSubscriber((update) => {
    return RUNTIME.subscribe(formula, update);
  });

  return {
    get current(): T {
      subscribe();
      return formula.current;
    },
  };
}
