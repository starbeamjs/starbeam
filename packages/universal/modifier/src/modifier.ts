import type { anydom } from "@domtree/flavors";
import { type Description, REUSE_ID } from "@starbeam/debug";
import type { Tagged } from "@starbeam/interfaces";
import { TAG, UNINITIALIZED } from "@starbeam/shared";
import { DelegateTag, getTag } from "@starbeam/tags";
import { Cell } from "@starbeam/universal";
import { expected, isPresent, verified, verify } from "@starbeam/verify";

export type ElementType<E extends anydom.Element> = abstract new <
  Args extends unknown[]
>(
  ...args: Args
) => E;

// export type Ref<E extends anydom.Element> = Initializable<E>;

export interface ElementPlaceholder<E extends anydom.Element> extends Tagged {
  readonly initialize: (value: E) => void;
  readonly current: E | null;
}

const REFS = new WeakMap<object, Cell<anydom.Element | UNINITIALIZED>>();

export function ElementPlaceholder<E extends anydom.Element>(
  type: ElementType<E>,
  description: Description
): ElementPlaceholder<E> {
  const ref = Object.create(null) as object;
  const elementCell = Cell<anydom.Element | UNINITIALIZED>(UNINITIALIZED, {
    description: description.implementation(REUSE_ID, {
      reason: "element cell",
    }),
  });

  REFS.set(ref, elementCell);

  return {
    [TAG]: DelegateTag.create(description, [getTag(elementCell)]),

    initialize(value: anydom.Element): void {
      const element = verified(REFS.get(ref), isPresent);
      verify(
        value,
        (anyElement): anyElement is E => anyElement instanceof type,
        expected(`A ref (${description.describe()})`)
          .toBe(`initialized with an instance of ${type.name}`)
          .butGot(() => `an instance of ${value.constructor.name}`)
      );
      element.current = value;
      element.freeze();
    },

    get current(): E | null {
      const current = verified(REFS.get(ref), isPresent).current as
        | E
        | UNINITIALIZED;

      return current === UNINITIALIZED ? null : current;
    },
  };
}
