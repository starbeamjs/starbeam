import type { Description } from "@starbeam/debug";
import { Stack } from "@starbeam/debug";
import { UNINITIALIZED } from "@starbeam/peer";
import { isNotEqual, verified } from "@starbeam/verify";

import { Reactive } from "../../reactive.js";
import { type Equality, Cell } from "../cell.js";
import { Formula } from "../formula/formula.js";

type FormulaFnOptions<T, U> =
  | {
      equals?: Equality<T>;
      fn: (value: T) => U;
    }
  | ((value: T) => U);

function normalizeOptions<T, U>(
  options: FormulaFnOptions<T, U>
): {
  equals: Equality<T>;
  fn: (value: T) => U;
} {
  if (typeof options === "function") {
    return {
      equals: Object.is,
      fn: options,
    };
  }

  return {
    equals: options.equals ?? Object.is,
    fn: options.fn,
  };
}

export function FormulaFn<T, U>(
  options: FormulaFnOptions<T, U>,
  description?: Description | string
): (value: T) => U {
  const { equals, fn } = normalizeOptions(options);

  const cell = Cell<T | UNINITIALIZED>(UNINITIALIZED, {
    description: Stack.description({
      type: "formula",
      api: {
        package: "@starbeam/core",
        name: "FormulaFn",
      },
      fromUser: description,
    }),
    equals: (a: T | UNINITIALIZED, b: T | UNINITIALIZED) => {
      if (a === UNINITIALIZED || b === UNINITIALIZED) {
        return false;
      }

      return equals(a, b);
    },
  });

  const desc = Reactive.description(cell);

  const formula = Formula(() => {
    const value = verified(cell.current, isNotEqual(UNINITIALIZED));
    return fn(value);
  }, desc.implementation({ reason: "FormulaFn formula" }));

  return (value: T) => {
    cell.set(value);

    return formula.current;
  };
}
