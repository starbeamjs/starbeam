import { CachedFormula, Cell, Marker } from "@starbeam/reactive";
import type { Sync } from "@starbeam/resource";
import { PrimitiveSyncTo, SyncTo } from "@starbeam/resource";
import { createPushScope, pushingScope } from "@starbeam/runtime";
import {
  finalize,
  isFinalized,
  mountFinalizationScope,
  onFinalize,
  pushFinalizationScope,
  UNINITIALIZED,
} from "@starbeam/shared";
import {
  isEqual,
  isNotEqual,
  isPresent,
  verified,
  verify,
} from "@starbeam/verify";
import {
  type AnyFunction,
  buildCause,
  entryPoint,
  isAssertionError,
  RecordedEvents,
} from "@starbeam-workspace/test-utils";
import { describe, expect, test } from "vitest";

describe("Sync", () => {
  test("a manual sync formula", () => {
    const state = setupSyncTest();
    const { events, invalidate } = state;

    function TestSync() {
      const scope = createPushScope();
      let last: object | undefined;
      events.record("setup");

      const sync = CachedFormula(() => {
        if (isFinalized(scope)) return;
        if (last) finalize(last);

        events.record("sync");
        const doneSyncScope = mountFinalizationScope(scope);
        const done = pushFinalizationScope();

        state.connect();
        invalidate.read();

        onFinalize(() => {
          events.record("cleanup");
          state.disconnect();
        });

        last = done();
        doneSyncScope();
      });

      onFinalize(scope, () => {
        events.record("finalize");
      });

      return { sync, value: undefined };
    }

    assertSyncLifecycle({
      Sync: { setup: TestSync },
      state,
    });
  });

  describe("implemented in terms of the simple API", () => {
    test("a single Sync", () => {
      const state = setupSyncTest();
      const { events, invalidate } = state;

      const TestSync = buildTestSync(events, {
        invalidate,
        test: {
          sync: () => void state.connect(),
          cleanup: () => void state.disconnect(),
        },
      });

      assertSyncLifecycle({
        Sync: TestSync,
        state,
      });
    });

    test("a child Sync used in the parent", () => {
      const state = setupSyncTest();
      const { events: allEvents } = state;

      const ChildSync = PrimitiveSyncTo(() => {
        // the setup phase of ChildSync
        const localEvents = allEvents.prefixed("child");

        localEvents.record("setup");

        return {
          sync: () => {
            // the sync phase of ChildSync
            localEvents.record("sync");
            state.invalidate.read();

            state.connect();

            return () => {
              localEvents.record("cleanup");
              state.disconnect();
            };
          },
          finalize: () => {
            localEvents.record("finalize");
          },
        };
      });

      const invalidateParent = Marker();

      const ParentSync = PrimitiveSyncTo(() => {
        // the setup phase of ParentSync
        const localEvents = allEvents.prefixed("parent");

        const child = ChildSync.setup();

        localEvents.record("setup");

        return {
          sync: () => {
            // the sync phase of ChildSync
            localEvents.record("sync");
            invalidateParent.read();

            child.sync();

            return () => {
              localEvents.record("cleanup");
            };
          },

          finalize: () => {
            localEvents.record("finalize");
          },
        };
      });

      assertNestedSyncLifecycle({
        ParentSync,
        state,
        allEvents,
        invalidateParent,
      });
    });
  });

  describe("implemented in terms of the high-level API", () => {
    test("a single Sync", () => {
      const state = setupSyncTest();
      const { events, invalidate } = state;

      const TestSync = SyncTo(({ on }) => {
        events.record("setup");

        on.sync(() => {
          events.record("sync");
          state.connect();
          invalidate.read();

          return () => {
            events.record("cleanup");
            state.disconnect();
          };
        });

        on.finalize(() => {
          events.record("finalize");
        });
      });

      assertSyncLifecycle({
        Sync: TestSync,
        state,
      });
    });

    test("a child Sync used in the parent", () => {
      const state = setupSyncTest();
      const { events: allEvents } = state;
      const ChildSync = buildTestSync(allEvents, {
        prefix: "child",
        invalidate: state.invalidate,
        test: {
          sync: () => void state.connect(),
          cleanup: () => void state.disconnect(),
        },
      });

      const invalidateParent = Marker();

      const ParentSync = buildTestSync(allEvents, {
        prefix: "parent",
        invalidate: invalidateParent,
        test: {
          setup: () => ChildSync.setup(),
          sync: (child) => void child.sync(),
        },
      });

      assertNestedSyncLifecycle({
        ParentSync,
        allEvents,
        state,
        invalidateParent,
      });
    });

    test("multiple children", () => {
      const allEvents = new RecordedEvents();

      // use five children to really stress test the scenario and ensure that it
      // doesn't pass just because the children are at the end or one away from
      // the end.
      const childStates = new Array(5).fill(0).map((_, i) => {
        const state = setupSyncTest({ events: allEvents, prefix: `child${i}` });
        const sync = buildTestSync(allEvents, {
          prefix: `child${i}`,
          invalidate: state.invalidate,
          test: {
            sync: () => void state.connect(),
            cleanup: () => void state.disconnect(),
          },
        });

        return { sync, state };
      });

      const invalidateParent = Marker();

      const ParentSync = buildTestSync(allEvents, {
        prefix: "parent",
        invalidate: invalidateParent,
        test: {
          setup: () => {
            return childStates.map((child) => child.sync.setup());
          },
          sync: (children) =>
            void children.forEach((child) => void child.sync()),
        },
      });

      const increment = (prev: number) => prev + 1;

      const children = new Children(
        allEvents,
        childStates,
        (child) => child.state.counter.current,
      );
      const [scope, { sync }] = pushingScope(() => ParentSync.setup());

      children.expect({
        initialized: children.map(() => 0),
        events: [...children.namedEvents("setup"), "parent:setup"],
      });

      children.forEach((child) => {
        child.state.increment();

        // nothing happens before the first sync because `increment` is
        // emulating an external process that doesn't do anything until `sync`
        // has happened.
        children.expect(UNCHANGED);
      });

      sync();

      children.expect({
        change: UNCHANGED,
        events: ["parent:sync", ...children.namedEvents("sync")],
      });

      children.forEach(({ state }, child) => {
        state.increment();

        children.expect({
          events: [child.namedEvent("increment")],
          change: {
            change: increment,
            child,
          },
        });
      });

      expectNoopSync();

      // invalidating the children, but deferring all of the synchronization
      // until all of the invalidations have occurred.

      children.forEach(({ state }) => {
        state.invalidate.mark();

        // invalidation doesn't do anything until `sync` has happened.
        children.expect(UNCHANGED);
      });

      sync();

      children.expect({
        change: UNCHANGED,
        events: [
          "parent:cleanup",
          "parent:sync",
          ...children.namedEvents("cleanup", "sync"),
        ],
      });

      expectNoopSync();

      // invalidating the children, synchronizing each of them after it
      // was invalidated, but before the next child was invalidated.
      children.forEach(({ state }, child) => {
        state.invalidate.mark();

        // invalidation doesn't do anything until `sync` has happened.
        children.expect(UNCHANGED);

        sync();

        children.expect({
          change: UNCHANGED,
          events: [
            "parent:cleanup",
            "parent:sync",
            ...child.namedEvents("cleanup", "sync"),
          ],
        });
      });

      expectNoopSync();

      children.forEach(({ state }, child) => {
        state.increment();

        children.expect({
          events: [child.namedEvent("increment")],
          change: child.change(increment),
        });

        expectNoopSync();
      });

      // invalidating again retains the state

      children.forEach(({ state }, child) => {
        state.invalidate.mark();

        // not until sync
        children.expect(UNCHANGED);

        sync();

        children.expect({
          change: UNCHANGED,
          events: [
            "parent:cleanup",
            "parent:sync",
            ...child.namedEvents("cleanup", "sync"),
          ],
        });

        expectNoopSync();
      });

      expectNoopSync();

      invalidateParent.mark();

      // not until sync
      children.expect(UNCHANGED);

      sync();

      // the children haven't invalidated, so the mere fact that the parent
      // invalidated doesn't cause the children to resync.
      children.expect({
        change: UNCHANGED,
        events: ["parent:cleanup", "parent:sync"],
      });

      expectNoopSync();

      finalize(scope);

      children.expect({
        change: UNCHANGED,
        events: [
          ...children.namedEvents("cleanup", "finalize"),
          "parent:cleanup",
          "parent:finalize",
        ],
      });

      expectNoopSync();

      children.forEach(({ state }) => {
        state.increment();

        children.expect(UNCHANGED);
      });

      expectNoopSync();

      // invalidating the children does nothing after finalization

      children.forEach(({ state }) => {
        state.invalidate.mark();

        children.expect(UNCHANGED);
      });

      expectNoopSync();

      // invalidating the parent also does nothing

      invalidateParent.mark();

      expectNoopSync();

      // finalizing again does nothing

      finalize(scope);

      expectNoopSync();

      function expectNoopSync() {
        entryPoint(
          () => {
            repeat(() => {
              sync();

              children.expect(UNCHANGED);
            });
          },
          { entryFn: expectNoopSync },
        );
      }
    });
  });
});

const UNCHANGED = Symbol("UNCHANGED");
type UNCHANGED = typeof UNCHANGED;

const isInitialized = isNotEqual(UNINITIALIZED);

type Change<U> = (prev: U) => U;

class Child<T, U> {
  readonly #events: RecordedEvents;
  readonly #sequence: number;
  readonly #value: T;
  #lastValue: U | UNINITIALIZED = UNINITIALIZED;
  #extract: (value: T) => U;

  constructor(
    events: RecordedEvents,
    sequence: number,
    value: T,
    extract: (value: T) => U,
  ) {
    this.#events = events;
    this.#sequence = sequence;
    this.#value = value;
    this.#extract = extract;
  }

  get value(): T {
    return this.#value;
  }

  get sequence(): number {
    return this.#sequence;
  }

  change(fn: (prev: U) => U): { change: Change<U>; child: Child<T, U> } {
    return {
      change: fn,
      child: this,
    };
  }

  assertInitialized(expected: U): void {
    verify(this.#lastValue, isEqual(UNINITIALIZED));

    const next = this.#extract(this.#value);
    expect(next).toBe(expected);

    this.#lastValue = next;
  }

  assertChange(change: UNCHANGED | ((prev: U) => U)): void {
    const prev = verified(this.#lastValue, isInitialized);

    const changeFn = change === UNCHANGED ? (prev: U) => prev : change;

    const next = this.#extract(this.#value);

    const expected = changeFn(prev);

    expect(
      next,
      change === UNCHANGED ? "should be unchanged" : "should change to",
    ).toBe(expected);

    this.#lastValue = next;
  }

  namedEvent(name: string): string {
    return `child${this.sequence}:${name}`;
  }

  namedEvents(...names: string[]): string[] {
    return names.map((name) => this.namedEvent(name));
  }
}

class Children<T, U> implements Iterable<Child<T, U>> {
  readonly #events: RecordedEvents;
  readonly #children: Child<T, U>[];

  constructor(events: RecordedEvents, children: T[], extract: (value: T) => U) {
    this.#events = events;
    this.#children = children.map(
      (child, i) => new Child(events, i, child, extract),
    );
  }

  expect(
    options:
      | ({ events?: string[] } & (
          | {
              change?: undefined;
              initialized?: undefined;
            }
          | {
              change:
                | UNCHANGED
                | {
                    change: Change<U>;
                    child: Child<T, U>;
                  };
              initialized?: undefined;
            }
          | {
              change?: undefined;
              initialized: U[];
            }
        ))
      | UNCHANGED,
  ) {
    entryPoint(
      () => {
        if (options === UNCHANGED) {
          for (const child of this.#children) {
            child.assertChange((prev) => prev);
          }
        } else if (options.change) {
          if (options.change === UNCHANGED) {
            for (const child of this.#children) {
              child.assertChange(UNCHANGED);
            }
          } else {
            const expectedChangedChild = options.change.child;
            for (const child of this.#children) {
              if (child === expectedChangedChild) {
                child.assertChange(options.change.change);
              } else {
                child.assertChange(UNCHANGED);
              }
            }
          }
        } else if (options.initialized) {
          this.#children.forEach((child) => {
            child.assertInitialized(
              verified(options.initialized[child.sequence], isPresent),
            );
          });
        }

        let expectedEvents: string[];

        if (options === UNCHANGED) {
          expectedEvents = [];
        } else {
          expectedEvents = options.events ?? [];
        }

        this.#events.expectEvents(expectedEvents);
      },
      // eslint-disable-next-line @typescript-eslint/unbound-method
      { entryFn: this.expect },
    );
  }

  [Symbol.iterator]() {
    return this.#children[Symbol.iterator]();
  }

  forEach(mapper: (value: T, child: Child<T, U>) => void) {
    this.#children.forEach((child) => void mapper(child.value, child));
  }

  map<V>(mapper: (value: T, index: number) => V): V[] {
    return this.#children.map((child, i) => mapper(child.value, i));
  }

  namedEvents(...events: string[]) {
    return this.#children.flatMap((child) =>
      events.map((e) => child.namedEvent(e)),
    );
  }
}

interface SyncTestState {
  events: RecordedEvents;
  record: (event: string) => void;
  counter: Cell<number>;
  invalidate: Marker;
  increment: () => void;
  connect: () => void;
  disconnect: () => void;
}

function setupSyncTest(options?: {
  events?: RecordedEvents;
  prefix?: string;
}): SyncTestState {
  const events: RecordedEvents = options?.events ?? new RecordedEvents();
  const record = options?.prefix
    ? events.prefixed(options.prefix).record
    : events.record;

  const counter = Cell(0);
  const invalidate = Marker();
  let isConnected = false;

  function increment() {
    if (isConnected) {
      record("increment");
      counter.current++;
    }
  }

  return {
    events,
    record,
    counter,
    invalidate,
    increment,
    connect: () => (isConnected = true),
    disconnect: () => (isConnected = false),
  };
}

function assertSyncLifecycle({
  Sync,
  state: { counter, events, increment, invalidate },
}: {
  Sync: Sync<void>;
  state: SyncTestState;
}) {
  const cause = buildCause(assertSyncLifecycle, "test was definde here");

  try {
    const [scope, { sync }] = pushingScope(() => Sync.setup());

    expect(counter.current).toBe(0);
    events.expect("setup");

    increment();
    expect(counter.current).toBe(0);
    events.expect([]);

    // this is where the framework is going to call sync (e.g. in useEffect in React).
    expect(counter.current).toBe(0);
    sync();
    events.expect("sync");

    sync();
    expect(counter.current).toBe(0);
    events.expect([]);

    increment();
    expect(counter.current).toBe(1);
    events.expect("increment");

    sync();
    expect(counter.current).toBe(1);
    events.expect([]);

    increment();
    expect(counter.current).toBe(2);
    events.expect("increment");

    // this invalidates and schedules a new sync.
    invalidate.mark();
    expect(counter.current).toBe(2);
    events.expect([]); // the sync formula wasn't read yet

    // this is when the framework actually runs the scheduled sync.
    sync();
    expect(counter.current).toBe(2);
    events.expect("cleanup", "sync");

    increment();
    expect(counter.current).toBe(3);
    events.expect("increment");

    sync();
    expect(counter.current).toBe(3);
    events.expect([]);

    finalize(scope);
    expect(counter.current).toBe(3);
    events.expect("cleanup", "finalize");

    increment();
    expect(counter.current).toBe(3);
    events.expect([]);

    invalidate.mark();
    expect(counter.current).toBe(3);
    events.expect([]);

    finalize(scope);
    expect(counter.current).toBe(3);
    events.expect([]);

    // synchronizing after finalization does nothing
    sync();
    expect(counter.current).toBe(3);
    events.expect([]);
  } catch (e) {
    if (isAssertionError(e)) {
      e.cause = cause;
    }

    throw e;
  }
}

function assertNestedSyncLifecycle({
  ParentSync,
  state,
  allEvents,
  invalidateParent,
}: {
  ParentSync: Sync<void>;
  state: SyncTestState;
  allEvents: RecordedEvents;
  invalidateParent: Marker;
}) {
  const cause = buildCause(assertNestedSyncLifecycle, "test was defined here");

  try {
    const [scope, { sync }] = pushingScope(() => ParentSync.setup());
    const { counter, increment, invalidate: invalidateChild } = state;
    const events = allEvents;

    expect(counter.current).toBe(0);
    events.expect("child:setup", "parent:setup");

    increment();
    expect(counter.current).toBe(0);
    events.expect([]);

    // this is where the framework is going to call sync (e.g. in useEffect in React).
    expect(counter.current).toBe(0);
    sync();
    events.expect("parent:sync", "child:sync");

    sync();
    expect(counter.current).toBe(0);
    events.expect([]);

    invalidateChild.mark();
    expect(counter.current).toBe(0);
    events.expect([]);

    sync();
    expect(counter.current).toBe(0);
    events.expect(
      "parent:cleanup",
      "parent:sync",
      "child:cleanup",
      "child:sync",
    );

    increment();
    expect(counter.current).toBe(1);
    events.expect("increment");

    sync();
    expect(counter.current).toBe(1);
    events.expect([]);

    increment();
    expect(counter.current).toBe(2);
    events.expect("increment");

    // this invalidates and schedules a new sync.
    invalidateChild.mark();
    expect(counter.current).toBe(2);
    events.expect([]); // the sync formula wasn't read yet

    // this is when the framework actually runs the scheduled sync.
    sync();
    expect(counter.current).toBe(2);
    events.expect(
      "parent:cleanup",
      "parent:sync",
      "child:cleanup",
      "child:sync",
    );

    invalidateParent.mark();
    expect(counter.current).toBe(2);
    events.expect([]);

    sync();
    expect(counter.current).toBe(2);
    events.expect("parent:cleanup", "parent:sync");

    increment();
    expect(counter.current).toBe(3);
    events.expect("increment");

    sync();
    expect(counter.current).toBe(3);
    events.expect([]);

    finalize(scope);
    expect(counter.current).toBe(3);
    events.expect(
      "child:cleanup",
      "child:finalize",
      "parent:cleanup",
      "parent:finalize",
    );

    increment();
    expect(counter.current).toBe(3);
    events.expect([]);

    invalidateChild.mark();
    expect(counter.current).toBe(3);
    events.expect([]);

    invalidateParent.mark();
    expect(counter.current).toBe(3);
    events.expect([]);

    finalize(scope);
    expect(counter.current).toBe(3);
    events.expect([]);

    sync();
    expect(counter.current).toBe(3);
    events.expect([]);
  } catch (e) {
    if (isAssertionError(e)) {
      e.cause = cause;
    }

    throw e;
  }
}

function buildTestSync<Setup extends undefined | (() => unknown)>(
  events: RecordedEvents,
  {
    prefix,
    invalidate,
    test,
  }: {
    prefix?: string;
    invalidate: Marker;
    test?: {
      setup?: Setup;
      sync?: (
        state: Setup extends AnyFunction ? ReturnType<Setup> : void,
      ) => void;
      cleanup?: () => void;
      finalize?: () => void;
    };
  },
): Sync<void> {
  return SyncTo(({ on }) => {
    const localEvents = prefix ? events.prefixed(prefix) : events;

    const state = test?.setup?.();

    localEvents.record("setup");

    on.sync(() => {
      localEvents.record("sync");
      invalidate.read();

      test?.sync?.(
        state as Setup extends AnyFunction ? ReturnType<Setup> : void,
      );

      return () => {
        localEvents.record("cleanup");
        test?.cleanup?.();
      };
    });

    on.finalize(() => {
      localEvents.record("finalize");
      test?.finalize?.();
    });
  });
}

function repeat(block: (sequence: number) => void, times: number = 2) {
  for (let i = 0; i < times; i++) {
    block(i);
  }
}
