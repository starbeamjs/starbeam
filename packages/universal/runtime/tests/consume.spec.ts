import {
  CachedFormula,
  Cell,
  DEBUG,
  Marker,
  RUNTIME,
} from "@starbeam/reactive";
import { getTag } from "@starbeam/runtime";
import { initializeFormulaTag } from "@starbeam/tags";
import { describe, expect, test } from "vitest";

import { Staleness } from "./support/testing.js";

describe("consumption", () => {
  test("the basics", () => {
    const number = Cell(1);
    const double = CachedFormula(() => number.current * 2);

    expect(double.current).toBe(2);

    number.current++;

    expect(double.current).toBe(4);
  });

  test("the primitive autotracking protocol", () => {
    const instance = Marker();

    // start an autotracking frame
    const done = RUNTIME.start();
    // consume the marker's tag in the autotracking frame
    RUNTIME.consume(getTag(instance));
    // finalize the frame, which should give us back the marker's tag
    const tags = done();
    // create a formula tag with the marker's tags
    const tag = initializeFormulaTag(DEBUG.Desc?.("formula"), () => tags);

    const stale = new Staleness();
    RUNTIME.subscribe(tag, () =>  void stale.invalidate());

    stale.expect("fresh");
    stale.expect(() => {
      instance.mark();
    }, "stale");
  });

  test("nested frames (with updates)", () => {
    const cellA = Cell(1);
    const cellB = Cell(2);
    const cellC = Cell(3);

    const doubleA = CachedFormula(() => cellA.current * 2);
    const doubleB = CachedFormula(() => cellB.current * 2);
    const doubleC = CachedFormula(() => cellC.current * 2);

    const sum = CachedFormula(() => {
      const abSum = doubleA.current + doubleB.current;

      if (abSum > 15) {
        return abSum + doubleC.current;
      } else {
        return abSum;
      }
    });

    const stale = new Staleness();
    expect(sum.current).toBe(6);

    const unsubscribe = RUNTIME.subscribe(getTag(sum), () => {
      stale.invalidate();
    });

    stale.expect("fresh");
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
