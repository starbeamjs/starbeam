import { Cell, Formula } from "@starbeam/reactive";
import { PUBLIC_TIMELINE } from "@starbeam/runtime";
import { describe, expect, test } from "vitest";

describe("frames", () => {
  test("subscription before first consumption", () => {
    const cell = Cell("Tom Dale");

    const formula = Formula(() => cell.current);

    let stale = false;

    const unsubscribe = PUBLIC_TIMELINE.on.change(formula, () => {
      stale = true;
    });

    expect(formula.current).toBe("Tom Dale");

    // The pollable doesn't fire initially.
    expect(stale).toBe(false);

    // The pollable fires after the cell changes.
    cell.current = "Jerry Seinfeld";
    expect(stale).toBe(true);
    stale = false;

    expect(formula.read()).toBe("Jerry Seinfeld");

    unsubscribe();

    cell.current = "J. Seinfeld";
    // the subscription doesn't fire after it was ubsubscribed
    expect(stale).toBe(false);

    // The lack of a subscription doesn't make the value incorrect
    expect(formula.current).toBe("J. Seinfeld");
  });

  test("subscription after first consumption", () => {
    const cell = Cell("Tom Dale");

    const formula = Formula(() => cell.current);

    let stale = false;

    expect(formula.read()).toBe("Tom Dale");

    const unsubscribe = PUBLIC_TIMELINE.on.change(formula, () => {
      stale = true;
    });

    // The pollable doesn't fire initially.
    expect(stale).toBe(false);

    // The pollable fires after the cell changes.
    cell.current = "Jerry Seinfeld";
    expect(stale).toBe(true);
    stale = false;

    expect(formula.current).toBe("Jerry Seinfeld");

    unsubscribe();

    cell.current = "J. Seinfeld";
    expect(stale).toBe(false);

    // The lack of a subscription doesn't make the value incorrect
    expect(formula.current).toBe("J. Seinfeld");
  });
});
