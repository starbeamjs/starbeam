import { UNINITIALIZED } from "@starbeam/peer";
import { describe, expect, test } from "vitest";

describe("UNINITALIZED", () => {
  test("is a symbol", () => {
    expect(typeof UNINITIALIZED).toBe("symbol");
    expect(UNINITIALIZED.description).toBe("starbeam.UNINITIALIZED");
  });

  test("is the same value each time (i.e. not an export let)", () => {
    expect(UNINITIALIZED).toBe(UNINITIALIZED);
  });

  test("is registered at Symbol.for('starbeam.UNINITIALIZED')", () => {
    expect(Symbol.for("starbeam.UNINITIALIZED")).toBe(UNINITIALIZED);
  });

  test("isn't one of the builtin symbols", () => {
    expect(UNINITIALIZED).not.toBe(Symbol.iterator);
    expect(UNINITIALIZED).not.toBe(Symbol.toStringTag);
    expect(UNINITIALIZED).not.toBe(Symbol.unscopables);
    expect(UNINITIALIZED).not.toBe(Symbol.hasInstance);
    expect(UNINITIALIZED).not.toBe(Symbol.isConcatSpreadable);
    expect(UNINITIALIZED).not.toBe(Symbol.match);
    expect(UNINITIALIZED).not.toBe(Symbol.replace);
    expect(UNINITIALIZED).not.toBe(Symbol.search);
    expect(UNINITIALIZED).not.toBe(Symbol.species);
    expect(UNINITIALIZED).not.toBe(Symbol.split);
    expect(UNINITIALIZED).not.toBe(Symbol.toPrimitive);

    // it's not node's inspect symbol
    expect(UNINITIALIZED).not.toBe(Symbol.for("nodejs.util.inspect.custom"));

    // other react symbols
    expect(UNINITIALIZED).not.toBe(Symbol.for("react.element"));
    expect(UNINITIALIZED).not.toBe(Symbol.for("react.forward_ref"));
    expect(UNINITIALIZED).not.toBe(Symbol.for("react.fragment"));
    expect(UNINITIALIZED).not.toBe(Symbol.for("react.profiler"));
    expect(UNINITIALIZED).not.toBe(Symbol.for("react.provider"));
    expect(UNINITIALIZED).not.toBe(Symbol.for("react.context"));
    expect(UNINITIALIZED).not.toBe(Symbol.for("react.concurrent_mode"));

    // observable symbol, casting Symbol to avoid TS error
    expect(UNINITIALIZED).not.toBe(Symbol.for("rxjs.internal.observable"));
  });
});
