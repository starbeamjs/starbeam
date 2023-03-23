import { Desc } from "@starbeam/debug";
import { Frame, TIMELINE } from "@starbeam/timeline";
import { describe, expect, test } from "vitest";

import { Cell } from "./support/mini-reactives.js";

describe("frames", () => {
  test("subscription before first consumption", () => {
    const cell = Cell("Tom Dale");

    const frame = TIMELINE.frame.evaluate(() => cell.current, {
      description: Desc("formula"),
    });

    let stale = false;

    const unsubscribe = TIMELINE.on.change(frame, () => {
      stale = true;
    });

    expect(Frame.value(frame)).toBe("Tom Dale");

    // The pollable doesn't fire initially.
    expect(stale).toBe(false);

    // The pollable fires after the cell changes.
    cell.current = "Jerry Seinfeld";
    expect(stale).toBe(true);
    stale = false;

    frame.evaluate(() => cell.current, TIMELINE.frame);

    expect(Frame.value(frame)).toBe("Jerry Seinfeld");

    unsubscribe();

    cell.current = "J. Seinfeld";
    expect(stale).toBe(false);

    frame.evaluate(() => cell.current, TIMELINE.frame);
    expect(stale).toBe(false);

    // The lack of a subscription doesn't make the value incorrect
    expect(Frame.value(frame)).toBe("J. Seinfeld");
  });

  test("subscription after first consumption", () => {
    const cell = Cell("Tom Dale");

    const frame = TIMELINE.frame.evaluate(() => cell.current, {
      description: Desc("formula"),
    });

    let stale = false;

    expect(Frame.value(frame)).toBe("Tom Dale");

    const unsubscribe = TIMELINE.on.change(frame, () => {
      stale = true;
    });

    // The pollable doesn't fire initially.
    expect(stale).toBe(false);

    // The pollable fires after the cell changes.
    cell.current = "Jerry Seinfeld";
    expect(stale).toBe(true);
    stale = false;

    frame.evaluate(() => cell.current, TIMELINE.frame);
    expect(Frame.value(frame)).toBe("Jerry Seinfeld");

    unsubscribe();

    cell.current = "J. Seinfeld";
    expect(stale).toBe(false);

    frame.evaluate(() => cell.current, TIMELINE.frame);
    expect(stale).toBe(false);

    // The lack of a subscription doesn't make the value incorrect
    expect(Frame.value(frame)).toBe("J. Seinfeld");
  });
});
