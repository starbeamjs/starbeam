import type { anydom } from "@domtree/flavors";
import { Stack } from "@starbeam/debug-utils";
import { assert, UNINITIALIZED } from "@starbeam/fundamental";
import {
  Cell,
  Formula,
  Linkable,
  StatefulFormula,
  TaskBuilder,
} from "@starbeam/reactive";

export type ElementType<E extends anydom.Element> = abstract new (
  ...args: any[]
) => E;

// export type Ref<E extends anydom.Element> = Initializable<E>;

export interface ElementPlaceholder<E extends anydom.Element> {
  readonly initialize: (value: E) => void;
  readonly current: E | null;
}

const REFS = new WeakMap<object, Cell<anydom.Element | UNINITIALIZED>>();

export function ElementPlaceholder<E extends anydom.Element>(
  type: ElementType<E>,
  description = Stack.describeCaller()
): ElementPlaceholder<E> {
  const ref = Object.create(null);
  REFS.set(ref, Cell(UNINITIALIZED));

  return {
    initialize(value: anydom.Element): void {
      const element = REFS.get(ref)!;
      assert(
        value instanceof type,
        `A ref (${description}) expected to be initialized with an instance of ${type.name}, but it was initialized with ${value.constructor.name}`
      );
      element.current = value;
      element.freeze();
    },

    get current(): E | null {
      const current = REFS.get(ref)!.current as E | UNINITIALIZED;

      return current === UNINITIALIZED ? null : current;
    },
  };
}

export function Modifier<E extends anydom.Element, T>(
  type: ElementType<E>,
  construct: (element: E, modifier: TaskBuilder) => () => T,
  description = Stack.describeCaller()
): (placeholder: {
  readonly current: E | null;
}) => Linkable<StatefulFormula<T | null>> {
  return (placeholder) => {
    return StatefulFormula((modifier) => {
      if (placeholder.current) {
        const formula = Formula(construct(placeholder.current, modifier));
        return () => formula.current;
      } else {
        return () => null;
      }
    }, description);
  };
}

export interface Modifier<E extends anydom.Element, T> {
  (ref: { readonly current: E | null }): Linkable<StatefulFormula<T | null>>;
}
