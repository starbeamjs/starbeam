import { isPresentArray } from "@starbeam/core-utils";
import type { ReactiveValue } from "@starbeam/interfaces";
import { CachedFormula, Cell, RUNTIME } from "@starbeam/reactive";
import { PUBLIC_TIMELINE, TAG } from "@starbeam/runtime";
import { createDelegateTag, getTag } from "@starbeam/tags";
import { describe, expect, test } from "vitest";

describe("Tagged", () => {
  test("subscribing to a cell", () => {
    const cell = Cell(0);
    let stale = false;

    PUBLIC_TIMELINE.on.change(cell, () => {
      stale = true;
    });

    expect(stale).toBe(false);

    cell.current++;

    expect(stale).toBe(true);
    stale = false;

    expect(cell.current).toBe(1);
  });

  test("subscribing to a formula before reading it lazily subscribes once read", () => {
    const cell = Cell(0);
    const formula = CachedFormula(() => cell.current);
    let stale = false;

    PUBLIC_TIMELINE.on.change(formula, () => {
      stale = true;
    });

    expect(formula.current).toBe(0);
    expect(stale).toBe(false);

    cell.current++;
    expect(formula.current).toBe(1);
    expect(stale).toBe(true);
  });

  test("subscribing to a formula", () => {
    let stale = false;

    const { sum, numbers } = Sum();
    expect(sum.read()).toBe(0);

    PUBLIC_TIMELINE.on.change(sum, () => {
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

  test("subscribing to a delegate", () => {
    const cell = Cell(0);

    const delegate: ReactiveValue<number> = {
      read: () => cell.current,
      [TAG]: createDelegateTag(RUNTIME.Desc?.("delegate"), [getTag(cell)]),
    };

    let stale = false;

    PUBLIC_TIMELINE.on.change(delegate, () => {
      stale = true;
    });

    expect(stale).toBe(false);

    cell.current++;

    expect(stale).toBe(true);
    stale = false;

    expect(cell.current).toBe(1);
  });

  test("subscribing to a delegate before reading one of its formula targets lazily subscribes once read", () => {
    const cell = Cell(0);
    const formula = CachedFormula(() => cell.current);

    const delegate: ReactiveValue<number> = {
      read: () => formula.current,
      [TAG]: createDelegateTag(RUNTIME.Desc?.("delegate", "test delegate"), [
        getTag(formula),
      ]),
    };

    let stale = false;

    PUBLIC_TIMELINE.on.change(delegate, () => {
      stale = true;
    });

    expect(formula.current).toBe(0);
    expect(stale).toBe(false);

    cell.current++;
    expect(formula.current).toBe(1);

    expect(stale).toBe(true);
  });

  test("subscribing to a formula delegate", () => {
    const { sum, numbers } = Sum();

    const delegate: ReactiveValue<number> = {
      read: () => sum.read(),
      [TAG]: createDelegateTag(RUNTIME.Desc?.("delegate", "test delegate"), [
        getTag(sum),
      ]),
    };

    let stale = false;
    expect(delegate.read()).toBe(0);

    const unsubscribe = PUBLIC_TIMELINE.on.change(delegate, () => {
      stale = true;
    });

    expect(stale).toBe(false);

    numbers.current = [...numbers.current, Cell(1, "one"), Cell(2, "two")];

    expect(delegate.read()).toBe(3);

    satisfying(numbers.current, isPresentArray)[0].current++;

    expect(stale).toBe(true);
    stale = false;

    expect(delegate.read()).toBe(4);

    unsubscribe();

    satisfying(numbers.current, isPresentArray)[0].current++;
    expect(stale).toBe(false);
    expect(delegate.read()).toBe(5);

    numbers.current = [...numbers.current, Cell(3)];
    expect(stale).toBe(false);

    expect(delegate.read()).toBe(8);
  });
});

function Sum(): {
  sum: ReactiveValue<number>;
  numbers: Cell<Cell<number>[]>;
} {
  const description = RUNTIME.Desc?.("formula", "Sum");
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
