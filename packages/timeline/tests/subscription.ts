import { descriptionFrom } from "@starbeam/debug";
import { getID } from "@starbeam/peer";
import { Frame, TIMELINE } from "@starbeam/timeline";
import { describe, expect, test } from "vitest";

import { Cell } from "./support/mini-reactives.js";

describe("frames", () => {
  test("subscription before first consumption", () => {
    const cell = Cell("Tom Dale");

    const formula = TIMELINE.frame.create({
      evaluate: () => cell.current,
      description: descriptionFrom({
        type: "formula",
        id: getID(),
        api: "Formula",
      }),
    });

    let stale = false;

    const unsubscribe = TIMELINE.on.change(formula, () => {
      stale = true;
    });

    expect(Frame.value(formula)).toBe("Tom Dale");

    // The pollable doesn't fire initially.
    expect(stale).toBe(false);

    // The pollable fires after the cell changes.
    cell.current = "Jerry Seinfeld";
    expect(stale).toBe(true);
    stale = false;

    TIMELINE.frame.update({ updating: formula, evaluate: () => cell.current });

    expect(Frame.value(formula)).toBe("Jerry Seinfeld");

    unsubscribe();

    cell.current = "J. Seinfeld";
    expect(stale).toBe(false);

    TIMELINE.frame.update({ updating: formula, evaluate: () => cell.current });
    expect(stale).toBe(false);

    // The lack of a subscription doesn't make the value incorrect
    expect(Frame.value(formula)).toBe("J. Seinfeld");
  });

  test("subscription after first consumption", () => {
    const cell = Cell("Tom Dale");

    const formula = TIMELINE.frame.create({
      evaluate: () => cell.current,
      description: descriptionFrom({
        type: "formula",
        id: getID(),
        api: "Formula",
      }),
    });

    let stale = false;

    expect(Frame.value(formula)).toBe("Tom Dale");

    const unsubscribe = TIMELINE.on.change(formula, () => {
      stale = true;
    });

    // The pollable doesn't fire initially.
    expect(stale).toBe(false);

    // The pollable fires after the cell changes.
    cell.current = "Jerry Seinfeld";
    expect(stale).toBe(true);
    stale = false;

    TIMELINE.frame.update({ updating: formula, evaluate: () => cell.current });

    expect(Frame.value(formula)).toBe("Jerry Seinfeld");

    unsubscribe();

    cell.current = "J. Seinfeld";
    expect(stale).toBe(false);

    TIMELINE.frame.update({ updating: formula, evaluate: () => cell.current });
    expect(stale).toBe(false);

    // The lack of a subscription doesn't make the value incorrect
    expect(Frame.value(formula)).toBe("J. Seinfeld");
  });
});
