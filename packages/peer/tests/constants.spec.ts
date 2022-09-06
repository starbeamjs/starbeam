import { COORDINATION, REACTIVE, UNINITIALIZED } from "@starbeam/peer";
import { describe, expect, test } from "vitest";

describe("symbols", () => {
  testSymbol(UNINITIALIZED, "UNINITIALIZED");
  testSymbol(REACTIVE, "REACTIVE");
  testSymbol(COORDINATION, "COORDINATION");
});

function testSymbol(symbol: symbol, description: string) {
  test("is a symbol", () => {
    expect(typeof symbol).toBe("symbol");
    expect(symbol.description).toBe(`starbeam.${description}`);
  });

  test("is the same value each time (i.e. not an export let)", () => {
    expect(symbol).toBe(symbol);
  });

  test(`is registered at Symbol.for('starbeam.${description}')`, () => {
    expect(Symbol.for(`starbeam.${description}`)).toBe(symbol);
  });

  test("isn't one of the builtin symbols", () => {
    expect(symbol).not.toBe(Symbol.iterator);
    expect(symbol).not.toBe(Symbol.toStringTag);
    expect(symbol).not.toBe(Symbol.unscopables);
    expect(symbol).not.toBe(Symbol.hasInstance);
    expect(symbol).not.toBe(Symbol.isConcatSpreadable);
    expect(symbol).not.toBe(Symbol.match);
    expect(symbol).not.toBe(Symbol.replace);
    expect(symbol).not.toBe(Symbol.search);
    expect(symbol).not.toBe(Symbol.species);
    expect(symbol).not.toBe(Symbol.split);
    expect(symbol).not.toBe(Symbol.toPrimitive);

    // it's not node's inspect symbol
    expect(symbol).not.toBe(Symbol.for("nodejs.util.inspect.custom"));

    // other react symbols
    expect(symbol).not.toBe(Symbol.for("react.element"));
    expect(symbol).not.toBe(Symbol.for("react.forward_ref"));
    expect(symbol).not.toBe(Symbol.for("react.fragment"));
    expect(symbol).not.toBe(Symbol.for("react.profiler"));
    expect(symbol).not.toBe(Symbol.for("react.provider"));
    expect(symbol).not.toBe(Symbol.for("react.context"));
    expect(symbol).not.toBe(Symbol.for("react.concurrent_mode"));

    // observable symbol, casting Symbol to avoid TS error
    expect(symbol).not.toBe(Symbol.for("rxjs.internal.observable"));
  });
}
