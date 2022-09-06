import { descriptionFrom, Stack } from "@starbeam/debug";
import { getID } from "@starbeam/peer";
import { TIMELINE } from "@starbeam/timeline";
import { describe, expect, test } from "vitest";

import { Cell, Formula, Marker } from "./support/mini-reactives.js";
import { Staleness } from "./support/testing.js";

describe("consumption", () => {
  test("in the context of a frame", () => {
    const { update, instance } = Marker();

    const id = getID();
    const here = Stack.fromCaller(-1);
    const frame = TIMELINE.frame.create({
      evaluate: () => TIMELINE.didConsumeCell(instance, here),
      description: descriptionFrom({
        id,
        type: "formula",
        api: "Formula",
      }),
    });

    const stale = new Staleness();
    TIMELINE.on.change(frame, () => {
      stale.invalidate();
    });

    stale.expect("fresh");
    stale.expect(update, "stale");
  });

  test("nested frames (with updates)", () => {
    const cellA = Cell(1);
    const cellB = Cell(2);
    const cellC = Cell(3);

    const doubleA = Formula(() => cellA.current * 2);
    const doubleB = Formula(() => cellB.current * 2);
    const doubleC = Formula(() => cellC.current * 2);

    const sum = Formula(() => {
      const abSum = doubleA.poll() + doubleB.poll();

      if (abSum > 15) {
        return abSum + doubleC.poll();
      } else {
        return abSum;
      }
    });

    const stale = new Staleness();
    const unsubscribe = TIMELINE.on.change(sum.frame, () => {
      stale.invalidate();
    });

    stale.expect("fresh");
    expect(sum.poll()).toBe(6);
    stale.expect(() => (cellA.current += 2), "stale");

    expect(sum.poll()).toBe(10);

    stale.expect(() => (cellB.current += 2), "stale");

    expect(sum.poll()).toBe(14);

    cellA.current += 2;
    stale.expect("stale");
    expect(sum.poll()).toBe(14 + 4 /* cellA increase */ + 6 /* cellC * 2 */);

    unsubscribe();

    stale.expect(() => (cellA.current += 2), "fresh");

    expect(sum.poll()).toBe(28);
  });
});
