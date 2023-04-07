import type { Description, Reactive } from "@starbeam/interfaces";
import { RUNTIME } from "@starbeam/reactive";
import { PUBLIC_TIMELINE } from "@starbeam/runtime";
import {
  Cell,
  Formula,
  LIFETIME,
  PolledFormula,
  Wrap,
} from "@starbeam/universal";
import { useLifecycle } from "@starbeam/use-strict-lifecycle";
import { useState } from "react";

import { useSetup } from "./use-setup.js";

/**
 * {@linkcode useReactive} is a Starbeam renderer that computes a value from reactive values and
 * automatically notifies React when the inputs change.
 *
 * It doesn't memoize the value, so if the component re-renders, the value will be recomputed. This
 * means that you can use normal React values in the formula without declaring any dependencies, but
 * still get notified if Starbeam dependencies change.
 *
 * If you also want to memoize the value, you can use {@linkcode useReactiveMemo}.
 */

export function useReactive<T>(
  computeFn: () => T,
  description?: string | Description | undefined
): T {
  const desc = RUNTIME.Desc?.("formula", description);

  const notify = useNotify();

  return useLifecycle({ props: computeFn }).render(
    ({ on }, originalCompute) => {
      let compute = originalCompute;

      // compute can change, so the `PolledFormula` doesn't close over the original value, but
      // rather invokes the **current** value (which can change in `on.update`).
      const formula = PolledFormula(() => compute(), desc);

      on.update((newCompute) => {
        compute = newCompute;
      });

      // We wait until the first layout to subscribe to the formula, because React will
      // only guarantee that the cleanup function is called after the first layout.
      on.layout(() => {
        const unsubscribe = PUBLIC_TIMELINE.on.change(formula, notify);
        on.cleanup(unsubscribe);
      });

      return formula;
    }
  ).current;
}

/**
 * Returns a function that can be called to notify React that the current component should be
 * re-rendered.
 */
export function useNotify(): () => void {
  const [, setNotify] = useState({});
  return () => {
    setNotify({});
  };
}

export function useCell<T>(
  value: T,
  description?: Description | string
): Cell<T> {
  const desc = RUNTIME.Desc?.("cell", description);

  return useSetup(() => ({ cell: Cell(value, { description: desc }) })).cell;
}

export class MountedReactive<T> {
  static create<T>(
    initial: T,
    description: Description
  ): MountedReactive<T> & Reactive<T | undefined> {
    const resource = new MountedReactive(initial, description);
    return Wrap(resource.formula, resource);
  }

  readonly formula: Formula<T | undefined>;
  readonly #initial: T;
  readonly #cell: Cell<Reactive<T | undefined> | undefined>;
  #value: Reactive<T | undefined> | undefined;
  #owner: object | undefined = undefined;

  private constructor(initial: T, description: Description | undefined) {
    this.#initial = initial;
    this.#cell = Cell(undefined as Reactive<T | undefined> | undefined, {
      description: description?.implementation(
        "cell",
        "target",
        "the storage a mounted reactive"
      ),
    });
    this.#value = undefined;
    this.formula = Formula(
      () => this.#cell.current?.current ?? this.#initial,
      description?.implementation(
        "formula",
        "current",
        "the current value of the reactive"
      )
    );

    LIFETIME.on.cleanup(this, () => {
      this.#finalize();
    });
  }

  #finalize(): void {
    if (this.#owner) {
      LIFETIME.finalize(this.#owner);
      this.#owner = undefined;
    }
  }

  #reset(): object {
    this.#finalize();

    this.#owner = {};
    LIFETIME.link(this, this.#owner);
    return this.#owner;
  }

  isInactive(): boolean {
    return this.#value === undefined;
  }

  create(factory: (owner: object) => Reactive<T | undefined>): {
    reactive: Reactive<T | undefined>;
    owner: object;
  } {
    const owner = this.#reset();

    const reactive = factory(owner);

    this.#cell.set(reactive);
    this.#value = reactive;

    // If the `use`d resource is finalized, and the return value of the factory is a resource, we
    // want to finalize that resource as well.
    LIFETIME.link(this, reactive);

    return { reactive, owner };
  }
}
