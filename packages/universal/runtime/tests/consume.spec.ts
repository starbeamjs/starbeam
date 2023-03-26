import { Desc, Stack } from "@starbeam/debug";
import { Cell, Formula, getRuntime, Marker } from "@starbeam/reactive";
import { getTag } from "@starbeam/runtime";
import { getID } from "@starbeam/shared";
import { FormulaTag } from "@starbeam/tags";
import { describe, expect, test } from "vitest";

import { Staleness } from "./support/testing.js";

const RUNTIME = getRuntime();

describe("consumption", () => {
  test("the basics", () => {
    const number = Cell(1);
    const double = Formula(() => number.current * 2);

    expect(double.current).toBe(2);

    number.current++;

    expect(double.current).toBe(4);
  });

  test("in the context of a frame", () => {
    const instance = Marker();

    const id = getID();
    const here = Stack.fromCaller(-1);
    const done = RUNTIME.autotracking.start();
    RUNTIME.autotracking.consume(getTag(instance));
    const tags = done();
    const tag = FormulaTag.create(Desc("formula"), () => tags);
    // const frame = TIMELINE.frame.evaluate(
    //   () => {
    //     TIMELINE.didConsumeCell(getTag(instance), here);
    //   },
    //   {
    //     description: descriptionFrom({
    //       id,
    //       type: "formula",
    //       api: "Formula",
    //     }),
    //   }
    // );

    const stale = new Staleness();
    RUNTIME.subscriptions.subscribe(tag, () => {
      stale.invalidate();
    });

    stale.expect("fresh");
    stale.expect(() => {
      instance.mark();
    }, "stale");
  });

  test("nested frames (with updates)", () => {
    const cellA = Cell(1);
    const cellB = Cell(2);
    const cellC = Cell(3);

    const doubleA = Formula(() => cellA.current * 2);
    const doubleB = Formula(() => cellB.current * 2);
    const doubleC = Formula(() => cellC.current * 2);

    const sum = Formula(() => {
      const abSum = doubleA.current + doubleB.current;

      if (abSum > 15) {
        return abSum + doubleC.current;
      } else {
        return abSum;
      }
    });

    const stale = new Staleness();
    const unsubscribe = RUNTIME.subscriptions.subscribe(getTag(sum), () => {
      stale.invalidate();
    });

    stale.expect("fresh");
    expect(sum.current).toBe(6);
    stale.expect(() => (cellA.current += 2), "stale");

    expect(sum.current).toBe(10);

    stale.expect(() => (cellB.current += 2), "stale");

    expect(sum.current).toBe(14);

    cellA.current += 2;
    stale.expect("stale");
    expect(sum.current).toBe(14 + 4 /* cellA increase */ + 6 /* cellC * 2 */);

    unsubscribe();

    stale.expect(() => (cellA.current += 2), "fresh");

    expect(sum.current).toBe(28);
  });
});
