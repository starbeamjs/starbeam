import { isPresentArray } from "@starbeam/core-utils";
import type { TaggedReactive } from "@starbeam/interfaces";
import { CachedFormula, Cell, DEBUG, Formula } from "@starbeam/reactive";
import { render, TAG } from "@starbeam/runtime";
import { getTag } from "@starbeam/tags";
import { describe, expect, test } from "vitest";

describe("Tagged", () => {
  test("rendering a cell", () => {
    const cell = Cell(0);
    let stale = false;

    render(cell, () => {
      stale = true;
    });

    expect(stale).toBe(false);

    cell.current++;

    expect(stale).toBe(true);
    stale = false;

    expect(cell.current).toBe(1);
  });

  test("rendering a formula before reading it lazily subscribes once read", () => {
    const cell = Cell(0);
    const formula = CachedFormula(() => cell.current);
    let stale = false;

    render(formula, () => {
      stale = true;
    });

    expect(formula.current).toBe(0);
    expect(stale).toBe(false);

    cell.current++;
    expect(formula.current).toBe(1);
    expect(stale).toBe(true);
  });

  test("rendering a formula", () => {
    let stale = false;

    const { sum, numbers } = Sum();
    expect(sum.read()).toBe(0);

    render(sum, () => {
      stale = true;
    });

    expect(stale).toBe(false);

    numbers.current = [...numbers.current, Cell(1), Cell(2)];

    // The subscription fires because we updated a dependency of an already-read reactive.
    expect(stale).toBe(true);

    expect(sum.read()).toBe(3);
    stale = false;

    expect(stale).toBe(false);

    const current = satisfying(numbers.current, isPresentArray);

    current[0].current++;

    expect(stale).toBe(true);
    stale = false;

    expect(sum.read()).toBe(4);
  });

  test("rendering a simple formula", () => {
    const cell = Cell(0);

    const formula = Formula(() => cell.current);

    let stale = false;

    expect(formula.read()).toBe(0);

    render(formula, () => {
      stale = true;
    });

    expect(stale).toBe(false);

    cell.current++;

    expect(formula.read()).toBe(1);
    expect(stale).toBe(true);
    stale = false;

    expect(cell.current).toBe(1);
  });

  test("rendering a formula before initialization lazily subscribes once read", () => {
    const cell = Cell(0);
    const formula = CachedFormula(() => cell.current);

    let stale = false;

    render(formula, () => {
      stale = true;
    });

    expect(formula.current).toBe(0);
    expect(stale).toBe(false);

    cell.current++;
    expect(formula.current).toBe(1);

    expect(stale).toBe(true);
  });

  test("rendering a formula delegate", () => {
    const { sum, numbers } = Sum();

    const delegate: TaggedReactive<number> = {
      read: () => sum.read(),
      get current() {
        return sum.current;
      },
      [TAG]: sum[TAG],
    };

    let stale = false;
    expect(delegate.read()).toBe(0);

    const unsubscribe = render(delegate, () => {
      stale = true;
    });

    expect(stale).toBe(false);

    numbers.current = [...numbers.current, Cell(1, "one"), Cell(2, "two")];

    expect(delegate.read()).toBe(3);

    satisfying(numbers.current, isPresentArray)[0].current++;

    expect(stale).toBe(true);
    stale = false;

    expect(delegate.read()).toBe(4);

    unsubscribe?.();

    satisfying(numbers.current, isPresentArray)[0].current++;
    expect(stale).toBe(false);
    expect(delegate.read()).toBe(5);

    numbers.current = [...numbers.current, Cell(3)];
    expect(stale).toBe(false);

    expect(delegate.read()).toBe(8);
  });

  describe("unsubscribing", () => {
    test("unsubscribing from a cell", () => {
      const cell = Cell(0);
      let stale = false;

      const unsubscribe = render(cell, () => {
        stale = true;
      });

      expect(stale).toBe(false);

      cell.current++;

      expect(stale).toBe(true);
      stale = false;

      unsubscribe?.();

      cell.current++;

      expect(stale).toBe(false);
    });

    test("unsubscribing from a formula", () => {
      const { sum, numbers } = Sum();
      let stale = false;

      expect(sum.read()).toBe(0);
      const unsubscribe = render(sum, () => {
        stale = true;
      });

      expect(stale).toBe(false);

      numbers.current = [...numbers.current, Cell(1), Cell(2)];

      expect(stale).toBe(true);
      stale = false;

      unsubscribe?.();

      numbers.current = [...numbers.current, Cell(3)];

      expect(stale).toBe(false);
    });

    test("unsubscribing from a delegate", () => {
      const cell = Cell(0);

      const delegate: TaggedReactive<number> = {
        read: () => cell.current,
        get current() {
          return cell.current;
        },
        [TAG]: getTag(cell),
      };

      let stale = false;

      const unsubscribe = render(delegate, () => {
        stale = true;
      });

      expect(stale).toBe(false);

      cell.current++;

      expect(stale).toBe(true);
      stale = false;

      unsubscribe?.();

      cell.current++;

      expect(stale).toBe(false);
    });

    test("unsubscribe from a subcription to an uninitialized formula before it was initialized", () => {
      const { sum, numbers } = Sum();
      let stale = false;

      const unsubscribe = render(sum, () => {
        stale = true;
      });

      expect(stale).toBe(false);

      // unsubscribing before the formula is initialized
      unsubscribe?.();

      expect(sum.read()).toBe(0);
      expect(stale).toBe(false);

      numbers.current = [...numbers.current, Cell(1), Cell(2)];
      expect(sum.read()).toBe(3);
      expect(stale).toBe(false);
    });

    test("unsubscribing from a subscription to an uninitialized formula after it was initialized", () => {
      const { sum, numbers } = Sum();
      let stale = false;

      const unsubscribe = render(sum, () => {
        stale = true;
      });

      expect(stale).toBe(false);

      numbers.current = [...numbers.current, Cell(1), Cell(2)];

      // the subscription is queued. It will be called when the formula is
      // initialized, but not before.
      expect(stale).toBe(false);

      // the formula is initialized
      expect(sum.read()).toBe(3);

      // the subscription is still not called, because the subscriptions are
      // only called when the value they represent is updated.
      expect(stale).toBe(false);

      numbers.current = [...numbers.current, Cell(3)];

      // the subscription is called, because the formula is updated
      expect(stale).toBe(true);
      stale = false;

      unsubscribe?.();

      numbers.current = [...numbers.current, Cell(4)];

      expect(stale).toBe(false);
    });
  });
});

function Sum(): {
  sum: TaggedReactive<number>;
  numbers: Cell<Cell<number>[]>;
} {
  const description = DEBUG?.Desc("formula", "Sum");
  const numbers = Cell([] as Cell<number>[], "number list");

  const sum = CachedFormula(
    () => numbers.current.reduce((acc, cell) => acc + cell.current, 0),
    description
  );

  return { sum, numbers };
}

function satisfying<T, U extends T>(
  value: T,
  predicate: (value: T) => value is U
): U {
  if (predicate(value)) {
    return value;
  } else {
    expect(value).toSatisfy(predicate);
    throw Error("unreachable");
  }
}
