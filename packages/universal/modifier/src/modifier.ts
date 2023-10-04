import type { anydom } from "@domtree/flavors";
import type { Description, Tagged } from "@starbeam/interfaces";
import { DEBUG, UNKNOWN_REACTIVE_VALUE } from "@starbeam/reactive";
import { TAG, UNINITIALIZED } from "@starbeam/shared";
import { getTag, initializeFormulaTag } from "@starbeam/tags";
import { Cell } from "@starbeam/universal";
import { expected, isPresent, verified, verify } from "@starbeam/verify";

export type ElementType<E extends anydom.Element> = abstract new <
  Args extends unknown[],
>(
  ...args: Args
) => E;

export interface ElementPlaceholder<E extends anydom.Element> extends Tagged {
  readonly initialize: (value: E) => void;
  readonly current: E | null;
}

const REFS = new WeakMap<object, Cell<anydom.Element | UNINITIALIZED>>();

export function ElementPlaceholder<E extends anydom.Element>(
  type: ElementType<E>,
  description: Description | undefined,
): ElementPlaceholder<E> {
  const ref = Object.create(null) as object;
  const elementCell = Cell<anydom.Element | UNINITIALIZED>(UNINITIALIZED, {
    description: description?.implementation(
      "cell",
      "element",
      "ref placeholder",
    ),
  });

  REFS.set(ref, elementCell);

  return {
    [TAG]: initializeFormulaTag(
      description,
      () => new Set([getTag(elementCell)]),
    ),

    initialize(value: anydom.Element): void {
      const element = verified(REFS.get(ref), isPresent);
      verify(
        value,
        (anyElement): anyElement is E => anyElement instanceof type,
        expected(`A ref (${describe(description)})`)
          .toBe(`initialized with an instance of ${type.name}`)
          .butGot(() => `an instance of ${value.constructor.name}`),
      );
      element.set(value);
      element.freeze();
    },

    get current(): E | null {
      DEBUG?.markEntryPoint(`ref.current`);
      const current = verified(REFS.get(ref), isPresent).read() as
        | E
        | UNINITIALIZED;

      return current === UNINITIALIZED ? null : current;
    },
  };
}

function describe(description: Description | undefined): string {
  return description && DEBUG
    ? DEBUG.describe(description)
    : UNKNOWN_REACTIVE_VALUE;
}
