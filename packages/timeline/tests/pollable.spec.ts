import { descriptionFrom } from "@starbeam/debug";
import { type Reactive, Frame, REACTIVE, TIMELINE } from "@starbeam/timeline";
import { describe, expect, test } from "vitest";
import { getID } from "../src/timeline/id.js";

import { Cell } from "./support/mini-reactives.js";

describe("pollable", () => {
  test("subscribing to a cell", () => {
    const cell = Cell(0);
    let stale = false;

    TIMELINE.on.change(cell, () => {
      stale = true;
    });

    expect(stale).toBe(false);

    cell.current++;

    expect(stale).toBe(true);
    stale = false;

    expect(cell.current).toBe(1);
  });

  test("subscribing to a composite", () => {
    let stale = false;

    const { sum, numbers } = Sum();

    TIMELINE.on.change(sum, () => {
      stale = true;
    });

    expect(stale).toBe(false);
    expect(sum.read()).toBe(0);

    numbers.current = [...numbers.current, Cell(1), Cell(2)];

    // The subscription fires because we updated a dependency of an already-read reactive.
    expect(stale).toBe(true);

    TIMELINE.update(sum);
    expect(stale).toBe(true);
    expect(sum.read()).toBe(3);
    stale = false;

    TIMELINE.update(sum);
    expect(stale).toBe(false);

    numbers.current[0].current++;
    expect(stale).toBe(true);
    stale = false;

    expect(sum.read()).toBe(4);
  });

  test("subscribing to a delegate", () => {
    const cell = Cell(0);

    const delegate: Reactive<number> = {
      read: () => cell.current,
      [REACTIVE]: {
        type: "delegate",
        description: descriptionFrom({
          id: getID(),
          type: "delegate",
          api: "delegate",
        }),
        delegate: [cell],
      },
    };

    let stale = false;

    TIMELINE.on.change(delegate, () => {
      stale = true;
    });

    expect(stale).toBe(false);

    cell.current++;

    expect(stale).toBe(true);
    stale = false;

    expect(cell.current).toBe(1);
  });

  test("subscribing to a delegate with a composite", () => {
    const { sum, numbers } = Sum();

    const delegate: Reactive<number> = {
      read: () => sum.read(),
      [REACTIVE]: {
        type: "delegate",
        description: descriptionFrom({
          id: getID(),
          type: "delegate",
          api: "delegate",
        }),
        delegate: [sum],
      },
    };

    let stale = false;

    const unsubscribe = TIMELINE.on.change(delegate, () => {
      stale = true;
    });

    expect(stale).toBe(false);

    numbers.current = [...numbers.current, Cell(1), Cell(2)];

    // The pollable doesn't fire because we didn't update the reactive.
    expect(stale).toBe(false);

    expect(delegate.read()).toBe(3);

    numbers.current[0].current++;
    expect(stale).toBe(true);
    stale = false;

    expect(delegate.read()).toBe(4);

    unsubscribe();

    numbers.current[0].current++;
    TIMELINE.update(sum);
    expect(stale).toBe(false);
    expect(delegate.read()).toBe(5);

    numbers.current = [...numbers.current, Cell(3)];
    TIMELINE.update(sum);
    expect(stale).toBe(false);

    expect(delegate.read()).toBe(8);
  });
});

function Sum() {
  const numbers: Cell<Cell<number>[]> = Cell([]);

  const frame = Frame.uninitialized<number>(
    TIMELINE.now,
    descriptionFrom({
      type: "formula",
      id: getID(),
      api: "Formula",
    })
  );

  const sum: Reactive<number> = {
    read: () => {
      return Frame.value(
        TIMELINE.frame.update({
          updating: frame,
          evaluate: () =>
            numbers.current.reduce((acc, cell) => acc + cell.current, 0),
        })
      );
    },
    [REACTIVE]: {
      type: "delegate",
      description: descriptionFrom({
        id: getID(),
        type: "delegate",
        api: "delegate",
      }),
      delegate: [frame],
    },
  };

  return { sum, numbers };
}
