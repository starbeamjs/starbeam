/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Cell, Marker } from "@starbeam/reactive";
import type { ResourceBlueprint, SyncFn, SyncResult } from "@starbeam/resource";
import { Resource, SyncTo } from "@starbeam/resource";
import type { FinalizationScope } from "@starbeam/runtime";
import { pushingScope } from "@starbeam/runtime";
import { finalize, UNINITIALIZED } from "@starbeam/shared";
import {
  describe,
  entryPoint,
  expect,
  RecordedEvents,
  test,
} from "@starbeam-workspace/test-utils";

describe("resources", () => {
  test("a manual resource built on Sync", () => {
    const events = new RecordedEvents();
    const invalidate = Marker();

    function Counter() {
      events.record("resource:setup");
      const counter = Cell(0);

      const { sync } = SyncTo(({ on }) => {
        events.record("sync:setup");

        on.sync(() => {
          events.record("sync:sync");
          invalidate.read();

          return () => {
            events.record("sync:cleanup");
          };
        });

        on.finalize(() => {
          events.record("sync:finalize");
        });
      }).setup();

      return {
        sync,
        counter: {
          get count() {
            return counter.current;
          },
          increment() {
            events.record("increment");
            counter.update((i) => i + 1);
          },
        },
      };
    }

    events.expect([]);

    const [scope, { sync, counter }] = pushingScope(() => Counter());
    events.expect("resource:setup", "sync:setup");
    expect(counter.count).toBe(0);

    counter.increment();
    events.expect("increment");
    expect(counter.count).toBe(1);

    counter.increment();
    events.expect("increment");
    expect(counter.count).toBe(2);

    sync();
    events.expect("sync:sync");
    expect(counter.count).toBe(2);

    sync();
    events.expect([]);
    expect(counter.count).toBe(2);

    counter.increment();
    events.expect("increment");
    expect(counter.count).toBe(3);

    counter.increment();
    events.expect("increment");
    expect(counter.count).toBe(4);

    // invalidate the sync formula but don't synchronize yet
    invalidate.mark();
    events.expect([]);
    expect(counter.count, "the count before synchronization").toBe(4);

    sync();
    events.expect("sync:cleanup", "sync:sync");
    // synchronization shouldn't have replaced the cell
    expect(counter.count).toBe(4);

    sync();
    events.expect([]);
    expect(counter.count).toBe(4);

    finalize(scope);
    events.expect("sync:cleanup", "sync:finalize");
    expect(counter.count).toBe(4);

    finalize(scope);
    events.expect([]);
    expect(counter.count).toBe(4);

    invalidate.mark();
    events.expect([]);
    expect(counter.count).toBe(4);

    sync();
    events.expect([]);
    expect(counter.count).toBe(4);

    finalize(scope);
    events.expect([]);
    expect(counter.count).toBe(4);
  });

  test("A simple Resource", () => {
    const events = new RecordedEvents();
    const invalidateSync = Marker();

    const Counter = Resource(({ on }) => {
      events.record("resource:setup");
      const counter = Cell(0);

      on.sync(() => {
        events.record("sync:sync");
        invalidateSync.read();

        return () => {
          events.record("sync:cleanup");
        };
      });

      on.finalize(() => {
        events.record("sync:finalize");
      });

      return {
        get count() {
          return counter.current;
        },
        increment: () => {
          events.record("increment");
          counter.update((i) => i + 1);
        },
      };
    });

    const {
      finalize,
      value: counter,
      act,
      defineAction,
    } = ResourceWrapper.use(Counter, {
      events,
      subject: (counter) => counter.count,
    }).expect({
      events: ["resource:setup"],
      value: 0,
    });

    const increment = defineAction(counter.increment).expect({
      events: ["increment"],
      change: (i) => i + 1,
      afterSync: UNCHANGED,
    });

    const invalidate = defineAction(invalidateSync.mark, "invalidate").expect({
      afterSync: {
        events: ["sync:cleanup", "sync:sync"],
      },
    });

    act(increment, {
      afterSync: {
        events: ["sync:sync"],
      },
    });

    act(invalidate);

    finalize({
      events: ["sync:cleanup", "sync:finalize"],
    });
  });

  test("a counter that persists across cleanups", () => {
    const events = new RecordedEvents();
    const invalidateSync = Marker();

    const Counter = Resource(({ on }) => {
      events.record("init");

      const count = Cell(0);

      on.sync(() => {
        events.record("setup");
        invalidateSync.read();

        return () => {
          events.record("cleanup");
        };
      });

      on.finalize(() => {
        events.record("finalize");
      });

      return {
        get count() {
          return count.current;
        },
        increment: () => {
          count.current++;
        },
      };
    });

    /// SETUP RESOURCE ///

    const resource = ResourceWrapper.use(Counter, {
      events: events,
      subject: (counter) => counter.count,
    }).expect({ events: ["init"], value: 0 });

    const { sync, finalize, value: counter, act, defineAction } = resource;

    /// DEFINE ACTIONS ///

    // incrementing the counter increments the value, but doesn't
    // invalidate the synchronization.
    const increment = defineAction(counter.increment).expect({
      change: (v) => v + 1,
      afterSync: UNCHANGED,
    });

    // invalidating the sync doesn't change the counter, and doesn't
    // immediately synchronize. When the resource is synchronized,
    // the cleanup and setup events are run.
    const invalidate = defineAction(invalidateSync.mark).expect({
      afterSync: {
        events: ["cleanup", "setup"],
        value: UNCHANGED,
      },
    });

    /// RUN THE TESTS ///

    // sync does four things:
    // 1. validates that the event list is empty before syncing
    // 2. syncs
    // 3. validates the provided events and value after syncing
    // 4. validates that syncing again retains the same value and
    //    doesn't record any events.
    sync().expect({ events: ["setup"], value: 0 });

    act(increment);
    act(invalidate);

    act(increment);
    act(invalidate);

    // after finalization, no further events are expected, even
    // those specified by `Action`s).
    finalize({ events: ["cleanup", "finalize"] });
    finalize();

    act(invalidate);

    // finalizing again does nothing.
    finalize();
  });

  test("child resources", () => {
    const events = new RecordedEvents();
    const invalidateChildSync = Marker();
    const invalidateParentSync = Marker();

    const Child = Resource(({ on }) => {
      events.record("child:setup");
      const count = Cell(0);

      on.sync(() => {
        events.record("child:sync");
        invalidateChildSync.read();

        return () => {
          events.record("child:cleanup");
        };
      });

      on.finalize(() => {
        events.record("child:finalize");
      });

      return {
        get count() {
          return count.current;
        },
        increment() {
          count.current++;
        },
      };
    });

    const Parent = Resource(({ use, on }) => {
      events.record("parent:setup");
      const child = use(Child);

      on.sync(() => {
        events.record("parent:sync");
        invalidateParentSync.read();

        return () => {
          events.record("parent:cleanup");
        };
      });

      on.finalize(() => {
        events.record("parent:finalize");
      });

      return {
        get childCount() {
          return child.count;
        },
        incrementChild: () => {
          child.increment();
        },
      };
    });

    const {
      sync,
      value: parent,
      defineAction,
      act,
      finalize,
    } = ResourceWrapper.use(Parent, {
      events,
      subject: (parent) => parent.childCount,
    }).expect({ events: ["parent:setup", "child:setup"], value: 0 });

    const increment = defineAction(parent.incrementChild).expect({
      change: (prev) => prev + 1,
    });

    const invalidateChild = defineAction(invalidateChildSync.mark).expect({
      afterSync: {
        events: ["child:cleanup", "child:sync"],
      },
    });

    const invalidateParent = defineAction(invalidateParentSync.mark).expect({
      afterSync: { events: ["parent:cleanup", "parent:sync"] },
    });

    sync().expect({
      events: ["parent:sync", "child:sync"],
    });

    act(increment);
    act(invalidateChild);

    act(invalidateParent);

    act(increment);
    act(invalidateChild);

    finalize({
      events: [
        "child:cleanup",
        "child:finalize",
        "parent:cleanup",
        "parent:finalize",
      ],
    });

    act(increment, { events: [] });
    act(invalidateChild, { events: [] });
    act(invalidateParent, { events: [] });

    finalize({ events: [] });
  });
});

const UNCHANGED = Symbol("LATEST");
type UNCHANGED = typeof UNCHANGED;

interface NormalizedExpectations<U> {
  events: string[];
  value: U | UNCHANGED;
}

export type ActionExpectations<U> =
  | UNCHANGED
  | {
      events?: string[];
      change?: UNCHANGED | ((value: U) => U);
      afterAction?: Expectations<U> | undefined;
      afterSync?: Expectations<U> | undefined;
    };

type Expectations<U> = Partial<NormalizedExpectations<U>> | UNCHANGED;

interface PostAssertion<U, V = void> {
  expect: (options: Expectations<U>, label?: string) => V;
}

interface Action<U> {
  label: string;
  step: () => void;
  /**
   * All events are assumed to be ignored after finalization.
   *
   * (If we find that we want to allow specific events to survive finalization,
   * we should allow that to be configured when the {@linkcode ResourceWrapper}
   * is created.)
   */
  events: string[];
  change: (prev: U) => U;
  afterAction: Expectations<U> | undefined;
  afterSync: Expectations<U> | undefined;
  cause: Error | undefined;
}

class ResourceWrapper<T, U> {
  static use = <T, U>(
    blueprint: ResourceBlueprint<T>,
    {
      events,
      subject,
      label,
    }: { events: RecordedEvents; subject: (value: T) => U; label?: string },
  ): PostAssertion<U, ResourceWrapper<T, U>> => {
    const [lifetime, instance] = entryPoint(
      () => {
        events.expect([]);
        return pushingScope(() => blueprint.setup());
      },
      {
        entryFn: ResourceWrapper.use,
        cause: "use was called here",
      },
    );

    const wrapper = new ResourceWrapper(
      label ?? "{anonymous resource}",
      lifetime,
      instance,
      events,
      subject,
    );

    const expectFn = (expected: Expectations<U>) => {
      wrapper.#expect(expected, label ? `use ${label}` : "use");
      return wrapper;
    };

    return { expect: expectFn };
  };

  readonly #label: string;
  readonly #value: T;
  readonly #extractSubject: (value: T) => U;
  readonly #sync: SyncFn<void>;
  readonly #lifetime: FinalizationScope;
  readonly #events: RecordedEvents;
  #lastSubject: UNINITIALIZED | U = UNINITIALIZED;
  #isFinalized = false;

  constructor(
    label: string,
    lifetime: FinalizationScope,
    instance: SyncResult<T>,
    events: RecordedEvents,
    subject: (value: T) => U,
  ) {
    this.#label = label;
    this.#value = instance.value;
    this.#extractSubject = subject;
    this.#sync = instance.sync;
    this.#lifetime = lifetime;
    this.#events = events;
  }

  get value(): T {
    return this.#value;
  }

  get #subject(): U {
    return this.#extractSubject(this.#value);
  }

  /**
   * Define an action for the resource.
   *
   * @example
   *
   * ```ts
   * const increment = defineAction(() => cell.increment())
   *   .expect({ events: ["incremented"], change: (prev) => prev + 1 });
   * ```
   *
   * The parameters to the expect method are:
   *
   * - `events`: The events expected to be recorded when the action runs.
   * (default: `[]`) - `change`: A function that takes the previous value and
   * returns the
   *   expected new value. (default: {@linkcode UNCHANGED})
   * - `sync`: Optionally, the parameter to the {@linkcode sync} method. This
   * parameter
   *   will be passed to the call to the {@linkcode sync} method that occurs
   *   after the action is run. If no `sync` parameter is provided, the
   *   {@linkcode act} call will assert {@linkcode UNCHANGED}.
   */
  defineAction = (
    step: () => void,
    label?: string,
  ): {
    expect: (expectations: ActionExpectations<U>) => Action<U>;
  } => {
    const source: { stack?: string } = {};

    if (Error.captureStackTrace) {
      Error.captureStackTrace(source, this.defineAction);
    }

    return {
      expect: (expectations): Action<U> => {
        function normalize(): Omit<Action<U>, "step" | "cause"> {
          const e = expectations === UNCHANGED ? undefined : expectations;
          const change =
            e?.change && e?.change !== UNCHANGED
              ? e.change
              : (value: U) => value;
          return {
            label: label ? label : step.name || `action`,
            events: e?.events ?? [],
            change,
            afterAction: e?.afterAction ?? undefined,
            afterSync: e?.afterSync ?? undefined,
          };
        }

        function buildCause() {
          if (source.stack) {
            const error = new Error("Action was defined here");
            error.stack = source.stack;
            return error;
          }
        }

        return {
          step,
          cause: buildCause(),
          ...normalize(),
        };
      },
    };
  };

  /**
   * The `act` method takes an action definition and thoroughly tests the action
   * by performing this sequence of steps **twice**:
   *
   * 1. Verify that the event list is empty.
   * 2. Run the action.
   * 3. Verify that the action has the expected value.
   * 4. Verify that the specified events were recorded.
   * 5. Synchronize.
   * 6. Verify the expected sync behavior (specified in the action definition
   *    under `action.sync`).
   *
   * After finalization, all of these steps are expected to record zero events.
   *
   * ## Overrides
   *
   * A second parameter to `act` allows a caller to override the expected
   * `events`, `change`, and `sync` parameters.
   *
   * These overrides apply to the first execution of the action (since the
   * second execution is expected to produce no changes to the value and no
   * events).
   *
   * If overrides are specified, the above sequence of steps is run three times
   * instead of twice (since the first action is a special case, and we want to
   * verify that there isn't a bug that makes the first non-special action
   * behave differently).
   */
  act = (
    action: Action<U>,
    overrides?: Partial<Omit<Action<U>, "step" | "cause">>,
  ) => {
    entryPoint(
      () => {
        this.#expect(UNCHANGED, `${action.label}: before act`);

        const firstAction = { ...action, ...overrides };
        const runs = overrides ? 3 : 2;

        // run the action twice
        for (let i = 0; i < runs; i++) {
          const currentAction = i === 0 ? firstAction : action;

          const expectedValue = currentAction.change(this.#subject);

          action.step();

          this.#expect(
            {
              events: this.#isFinalized ? [] : currentAction.events ?? [],
              value: expectedValue,
            },
            `${action.label} (${i + 1}/${runs}): after`,
          );

          this.sync({
            before: currentAction.afterAction ?? UNCHANGED,
            label: `(${i + 1}/${runs}): after action`,
          }).expect(
            currentAction.afterSync ?? UNCHANGED,
            `${action.label} (${i + 1}/${runs}): after sync`,
          );
        }
      },
      {
        entryFn: this.act,
        cause: "act was called here",
      },
    );
  };

  /**
   * Sync performs these steps:
   *
   * 1. Assert {@linkcode UNCHANGED}.
   * 2. Synchronize.
   * 3. Assert specified {@linkcode Expectations}.
   * 5. Synchronize again.
   * 6. Assert {@linkcode UNCHANGED}.
   */
  sync = ({
    before = UNCHANGED,
    label,
  }: {
    label?: string;
    before?: Expectations<U>;
  } = {}): PostAssertion<U> => {
    entryPoint(
      () => {
        const fullLabel = label
          ? `${this.#label} ${label}`
          : `${this.#label}: before sync`;
        this.#expect(before, fullLabel);
        this.#sync();
      },
      {
        entryFn: this.sync,
      },
    );

    const expectFn = (options: Expectations<U>) => {
      entryPoint(
        () => {
          this.#expect(
            {
              ...this.#normalizeExpectations(options),
            },
            `${this.#label}: after sync`,
          );

          // repeat the synchronization in order to assert that the second sync
          // doesn't do anything.
          this.#sync();

          this.#expect(
            {
              events: [],
              value: UNCHANGED,
            },
            `${this.#label}: second sync`,
          );
        },
        { entryFn: expectFn },
      );
    };

    return { expect: expectFn };
  };

  /**
   * Finalize performs these steps:
   *
   * 1. Assert {@linkcode UNCHANGED}.
   * 2. {@linkcode finalize} the resource (by finalizing the finalization scope
   *    that was used when the resource was created).
   * 3. Assert specified {@linkcode Expectations} (defaults: empty events,
   *    unchanged value).
   * 5. Synchronize.
   * 6. Assert {@linkcode UNCHANGED}.
   * 7. {@linkcode finalize} again.
   * 8. Assert {@linkcode UNCHANGED}.
   */
  finalize = (options?: Expectations<U>): void => {
    entryPoint(
      () => {
        const { events, value } = this.#normalizeExpectations(
          options ?? UNCHANGED,
        );

        this.#expect(UNCHANGED, `${this.#label}: before finalize`);

        finalize(this.#lifetime);

        this.#expect(
          {
            events,
            value,
          },
          `${this.#label}: after finalize`,
        );

        this.#isFinalized = true;

        this.sync().expect(UNCHANGED, `${this.#label}: sync after finalize`);

        finalize(this.#lifetime);
        this.#expect(UNCHANGED, `${this.#label}: after second finalize`);
      },
      {
        entryFn: this.finalize,
      },
    );
  };

  readonly #expect = (expectations: Expectations<U>, label: string) => {
    const { events: events, value } = this.#normalizeExpectations(expectations);

    let expectedSubject: U;

    if (value !== UNCHANGED) {
      expectedSubject = value;
    } else {
      if (this.#lastSubject === UNINITIALIZED) {
        expect(
          this.#lastSubject,
          `${label}: expects an initialized value`,
        ).not.toBe(UNINITIALIZED);
        throw new Error("BUG: unreachable");
      }
      expectedSubject = this.#lastSubject;
    }

    this.#events.expectEvents(events, label);
    expect(this.#subject, label).toStrictEqual(expectedSubject);

    this.#lastSubject = expectedSubject;
  };

  readonly #normalizeExpectations = <U>(
    options: Expectations<U>,
  ): NormalizedExpectations<U> => {
    if (options === UNCHANGED) {
      return {
        events: [],
        value: UNCHANGED,
      };
    } else {
      return {
        events: this.#isFinalized ? [] : options.events ?? [],
        value: options.value ?? UNCHANGED,
      };
    }
  };
}
