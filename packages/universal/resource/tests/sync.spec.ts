import { CachedFormula, Cell, Marker } from "@starbeam/reactive";
import { SyncTo } from "@starbeam/resource";
import { pushingScope } from "@starbeam/runtime";
import {
  finalize,
  linkToFinalizationScope,
  onFinalize,
  pushFinalizationScope,
} from "@starbeam/shared";
import { RecordedEvents } from "@starbeam-workspace/test-utils";
import { describe, expect, test } from "vitest";

describe("Sync", () => {
  test("a manual sync formula", () => {
    const actions = new RecordedEvents();

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
    const actions = new RecordedEvents();

    const counter = Cell(0);
    const invalidate = Marker();
    let isConnected = false;

    function increment() {
      if (isConnected) {
        actions.record("increment");
        counter.current++;
      }
    }

    const TestSync = SyncTo(({ on }) => {
      // this should be called the setup phase
      actions.record("init");

      on.sync(() => {
        actions.record("sync");
        isConnected = true;
        invalidate.read();

        return () => {
          actions.record("cleanup");
          isConnected = false;
        };
      });

      on.finalize(() => {
        actions.record("finalize");
      });
    });

    const [scope, sync] = pushingScope(() => TestSync());

    expect(counter.current).toBe(0);
    actions.expect("init");

    increment();
    expect(counter.current).toBe(0);
    actions.expect([]);

    // this is where the framework is going to call sync (e.g. in useEffect in React).
    sync();
    expect(counter.current).toBe(0);
    actions.expect("sync");

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

    // this invalidates and schedules a new sync.
    invalidate.mark();
    expect(counter.current).toBe(2);
    actions.expect([]); // the sync formula wasn't read yet

    // this is when the framework actually runs the scheduled sync.
    sync();
    expect(counter.current).toBe(2);
    actions.expect("cleanup", "sync");

    increment();
    expect(counter.current).toBe(3);
    actions.expect("increment");

    sync();
    expect(counter.current).toBe(3);
    actions.expect([]);

    finalize(scope);
    expect(counter.current).toBe(3);
    actions.expect("cleanup", "finalize");

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
