import "@starbeam/runtime";

import { CachedFormula, Cell, Marker } from "@starbeam/reactive";
import { Sync } from "@starbeam/resource";
import {
  finalize,
  linkToFinalizationScope,
  onFinalize,
  pushFinalizationScope,
} from "@starbeam/shared";
import { Actions } from "@starbeam-workspace/test-utils";
import { describe, expect, test } from "vitest";

describe("Sync", () => {
  test("a manual sync formula", () => {
    const actions = new Actions();

    const counter = Cell(0);
    const invalidate = Marker();
    let isSetup = false;

    function increment() {
      if (isSetup) {
        actions.record("increment");
        counter.current++;
      }
    }

    const scope = pushFinalizationScope()();
    let last: object | undefined;

    const sync = CachedFormula(() => {
      if (last) finalize(last);

      actions.record("setup");
      const done = pushFinalizationScope();

      isSetup = true;
      invalidate.read();

      onFinalize(() => {
        actions.record("cleanup");
        isSetup = false;
      });

      last = done();
      linkToFinalizationScope(last, scope);
    });

    expect(counter.current).toBe(0);
    actions.expect([]);

    increment();
    expect(counter.current).toBe(0);
    actions.expect([]);

    sync();
    expect(counter.current).toBe(0);
    actions.expect("setup");

    sync();
    expect(counter.current).toBe(0);
    actions.expect([]);

    increment();
    expect(counter.current).toBe(1);
    actions.expect("increment");

    sync();
    expect(counter.current).toBe(1);
    actions.expect([]);

    increment();
    expect(counter.current).toBe(2);
    actions.expect("increment");

    invalidate.mark();
    expect(counter.current).toBe(2);
    actions.expect([]); // the sync formula wasn't read yet

    sync();
    expect(counter.current).toBe(2);
    actions.expect("cleanup", "setup");

    increment();
    expect(counter.current).toBe(3);
    actions.expect("increment");

    sync();
    expect(counter.current).toBe(3);
    actions.expect([]);

    finalize(scope);
    expect(counter.current).toBe(3);
    actions.expect("cleanup");

    increment();
    expect(counter.current).toBe(3);
    actions.expect([]);

    invalidate.mark();
    expect(counter.current).toBe(3);
    actions.expect([]);

    finalize(scope);
    expect(counter.current).toBe(3);
    actions.expect([]);
  });

  test("using the Sync API", () => {
    const actions = new Actions();

    const counter = Cell(0);
    const invalidate = Marker();
    let isSetup = false;

    function increment() {
      if (isSetup) {
        actions.record("increment");
        counter.current++;
      }
    }

    const scope = pushFinalizationScope()();

    const sync = Sync(() => {
      actions.record("setup");
      isSetup = true;
      invalidate.read();

      return () => {
        actions.record("cleanup");
        isSetup = false;
      };
    })(scope);

    expect(counter.current).toBe(0);
    actions.expect([]);

    increment();
    expect(counter.current).toBe(0);
    actions.expect([]);

    sync();
    expect(counter.current).toBe(0);
    actions.expect("setup");

    sync();
    expect(counter.current).toBe(0);
    actions.expect([]);

    increment();
    expect(counter.current).toBe(1);
    actions.expect("increment");

    sync();
    expect(counter.current).toBe(1);
    actions.expect([]);

    increment();
    expect(counter.current).toBe(2);
    actions.expect("increment");

    invalidate.mark();
    expect(counter.current).toBe(2);
    actions.expect([]); // the sync formula wasn't read yet

    sync();
    expect(counter.current).toBe(2);
    actions.expect("cleanup", "setup");

    increment();
    expect(counter.current).toBe(3);
    actions.expect("increment");

    sync();
    expect(counter.current).toBe(3);
    actions.expect([]);

    finalize(scope);
    expect(counter.current).toBe(3);
    actions.expect("cleanup");

    increment();
    expect(counter.current).toBe(3);
    actions.expect([]);

    invalidate.mark();
    expect(counter.current).toBe(3);
    actions.expect([]);

    finalize(scope);
    expect(counter.current).toBe(3);
    actions.expect([]);
  });
});
