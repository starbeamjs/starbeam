import { Cell, Setup } from "@starbeam/core";
import { ReactiveProtocol, TIMELINE } from "@starbeam/timeline";
import { describe, expect, test } from "vitest";

describe("Setup", () => {
  test("setup without cleanup", () => {
    let variable = { cell: 0, counter: 0 };
    let counter = 0;
    const cell = Cell(0);

    const setup = Setup(() => {
      variable = { cell: cell.current, counter: ++counter };
    });

    expect(variable).toEqual({
      cell: 0,
      counter: 0,
    });

    setup();

    expect(variable).toEqual({
      cell: 0,
      counter: 1,
    });

    setup();

    expect(variable).toEqual({
      cell: 0,
      counter: 1,
    });

    cell.set(1);

    expect(variable).toEqual({
      cell: 0,
      counter: 1,
    });

    setup();
    expect(variable).toEqual({
      cell: 1,
      counter: 2,
    });
  });

  test("setup with cleanup", () => {
    let variable = { cell: 0, counter: 0, pairCounter: 0 };
    let counter = 0;
    let pairCounter = 0;
    const cell = Cell(0);

    const setup = Setup(() => {
      pairCounter++;
      variable = { cell: cell.current, counter: ++counter, pairCounter };

      return () => {
        pairCounter--;
        variable.pairCounter = pairCounter;
      };
    });

    expect(variable).toEqual({
      cell: 0,
      counter: 0,
      pairCounter: 0,
    });

    setup();

    expect(variable).toEqual({
      cell: 0,
      counter: 1,
      pairCounter: 1,
    });

    setup();

    expect(variable).toEqual({
      cell: 0,
      counter: 1,
      pairCounter: 1,
    });

    cell.set(1);

    expect(variable).toEqual({
      cell: 0,
      counter: 1,
      pairCounter: 1,
    });

    setup();

    expect(variable).toEqual({
      cell: 1,
      counter: 2,
      pairCounter: 1,
    });
  });

  test("setup is reactive", () => {
    let variable = { cell: 0, setupCounter: 0, cleanupCounter: 0 };
    let setupCounter = 0;
    let cleanupCounter = 0;
    const cellA = Cell(0);
    const cellB = Cell(10);

    const setup = Setup(() => {
      setupCounter++;
      variable = {
        cell: cellA.current % 2 === 0 ? cellA.current : cellB.current,
        setupCounter,
        cleanupCounter: cleanupCounter,
      };

      return () => {
        cleanupCounter++;
        variable.cleanupCounter = cleanupCounter;
      };
    });

    let ts = TIMELINE.now;

    expect(variable).toEqual({
      cell: 0,
      setupCounter: 0,
      cleanupCounter: 0,
    });

    expect(ReactiveProtocol.lastUpdated(setup)).toSatisfy(eq(ts));

    setup();

    expect(ReactiveProtocol.lastUpdated(setup)).toSatisfy(eq(ts));

    expect(variable).toEqual({
      cell: 0,
      setupCounter: 1,
      cleanupCounter: 0,
    });

    // cellB is not used in the initial setup, so it doesn't invalidate the setup
    cellB.set(20);
    expect(ReactiveProtocol.lastUpdated(setup)).toSatisfy(eq(ts));

    setup();

    expect(ReactiveProtocol.lastUpdated(setup)).toSatisfy(eq(ts));

    expect(variable).toEqual({
      cell: 0,
      setupCounter: 1,
      cleanupCounter: 0,
    });

    cellA.set(1);

    expect(ReactiveProtocol.lastUpdated(setup)).toSatisfy(gt(ts));
    ts = ReactiveProtocol.lastUpdated(setup);

    expect(variable).toEqual({
      cell: 0,
      setupCounter: 1,
      cleanupCounter: 0,
    });

    setup();

    expect(ReactiveProtocol.lastUpdated(setup)).toSatisfy(eq(ts));

    expect(variable).toEqual({
      cell: 20,
      setupCounter: 2,
      cleanupCounter: 1,
    });

    cellA.set(2);

    expect(ReactiveProtocol.lastUpdated(setup)).toSatisfy(gt(ts));
    ts = ReactiveProtocol.lastUpdated(setup);

    expect(variable).toEqual({
      cell: 20,
      setupCounter: 2,
      cleanupCounter: 1,
    });

    setup();

    expect(ReactiveProtocol.lastUpdated(setup)).toSatisfy(eq(ts));

    expect(variable).toEqual({
      cell: 2,
      setupCounter: 3,
      cleanupCounter: 2,
    });
  });
});

function eq<T extends { eq(other: T): boolean }>(other: T) {
  return (value: T) => value.eq(other);
}

function gt<T extends { gt(other: T): boolean }>(other: T) {
  return (value: T) => value.gt(other);
}
