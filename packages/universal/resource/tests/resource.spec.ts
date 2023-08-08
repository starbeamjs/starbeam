import { Cell, Marker } from "@starbeam/reactive";
import type { ResourceBlueprint, SyncFn, SyncResult } from "@starbeam/resource";
import { Resource, SyncTo } from "@starbeam/resource";
import { type FinalizationScope, pushingScope } from "@starbeam/runtime";
import { finalize, UNINITIALIZED } from "@starbeam/shared";
import {
  buildCause,
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
        increment() {
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

  // test("the basics", () => {
  //   const events = new Actions();
  //   const testResource = new TestResource(events);
  //   events.expect("init");

  //   events.expect([]);
  //   testResource.sync().expect("setup");

  //   testResource.invalidateSetup();
  //   testResource.sync().expect("cleanup", "setup");
  //   expect(testResource.count).toBe(0);

  //   testResource.value.increment();
  //   events.expect([]);
  //   expect(testResource.count).toBe(1);

  //   testResource.invalidateSetup();
  //   testResource.sync().expect("cleanup", "setup");
  //   // the resource's state hasn't changed
  //   expect(testResource.count).toBe(1);

  //   testResource.value.increment();
  //   events.expect([]);
  //   expect(testResource.count).toBe(2);

  //   testResource.finalize();
  //   expect(testResource.count).toBe(2);

  //   testResource.finalize({ expect: "noop" });
  //   expect(testResource.count).toBe(2);

  //   // this won't do anything because the `increment` method emulates a resource
  //   // whose updates are happening via the process set up in `setup`.
  //   testResource.value.increment();
  //   events.expect([]);
  //   expect(testResource.count).toBe(2);

  //   testResource.finalize({ expect: "noop" });
  //   expect(testResource.count).toBe(2);
  //   events.expect([]);
  // });

  // test("on.cleanup only runs when the resource is finally cleaned up", () => {
  //   const events = new Actions();
  //   const invalidate = Marker();

  //   const TestResource = Resource(({ on }) => {
  //     events.record("init");
  //     const cell = Cell(0);

  //     on.finalize(() => {
  //       events.record("finalize");
  //     });

  //     on.setup(() => {
  //       events.record("setup");
  //       invalidate.read();
  //       cell.current++;

  //       return () => {
  //         events.record("cleanup");
  //       };
  //     });

  //     return cell;
  //   });

  //   const resource = ResourceWrapper.use(TestResource, events);
  //   events.expect("init");

  //   const { value, sync, finalize } = resource;
  //   expect(value.current).toBe(0);

  //   sync().expect("setup");
  //   expect(value.current).toBe(1);

  //   sync().expect([]);
  //   expect(value.current).toBe(1);

  //   invalidate.mark();
  //   events.expect([]);
  //   expect(value.current, "the value before sync has occurred").toBe(1);
  //   sync().expect("cleanup", "setup");

  //   invalidate.mark();
  //   events.expect([]);
  //   expect(value.current, "the value after sync has occurred").toBe(2);
  //   sync().expect("cleanup", "setup");

  //   finalize({ afterActions: ["finalize"] });
  // });

  // test("if a resource constructor returns a reactive value, it is assimilated", () => {
  //   const events = new Actions();
  //   const initial = Cell(0);
  //   const plus = Cell(0);
  //   const Test = Resource(({ on }) => {
  //     events.record("init");
  //     const cell = Cell(initial.current);

  //     on.setup(() => {
  //       events.record("setup");
  //       cell.current = initial.current;

  //       return () => void events.record("cleanup");
  //     });

  //     return CachedFormula(() => cell.current + plus.current);
  //   });

  //   const resource = ResourceWrapper.use(Test, events);
  //   const { value, sync, finalize } = resource;

  //   events.expect("init");

  //   plus.current++;
  //   expect(value.current).toBe(1);
  //   events.expect([]);

  //   sync().expect("setup");

  //   initial.current++;
  //   expect(value.current, "the value before sync has occurred").toBe(1);
  //   sync().expect("cleanup", "setup");
  //   expect(value.current, "the value after sync has occurred").toBe(2);

  //   finalize();
  //   expect(value.current, "the value after finalize has occurred").toBe(2);

  //   // synchronizing after finalization doesn't run setups again
  //   sync().expect([]);
  //   // the value remains stable
  //   expect(value.current, "the value after sync has occurred").toBe(2);

  //   finalize({ expect: "noop" });
  // });

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
        increment() {
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
          return child().count;
        },
        incrementChild() {
          child().increment();
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
      // since the child sync is used in the `childCount` getter, the
      // synchronization occurs the next time the getter is called.
      //
      // In practice, the getter will also be invoked during a synchronization
      // step, but we're testing the difference here to be thorough.
      afterAction: {
        events: ["child:cleanup", "child:sync"],
      },
    });

    // since the parent sync is not used in the getter we're testing, we don't
    // expect the sync to occur until the next time synchronization occurs.
    const invalidateParent = defineAction(invalidateParentSync.mark).expect({
      afterSync: { events: ["parent:cleanup", "parent:sync"] },
    });

    sync({
      before: {
        events: ["child:sync"],
      },
    }).expect({
      events: ["parent:sync"],
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

  // test("child resources", () => {
  //   const name = Cell("default");
  //   let connectedCount = 0;
  //   const Socket = Resource(({ on }) => {
  //     const connected = {
  //       socketName: name.current as string | null,
  //       connected: ++connectedCount,
  //     };

  //     on.cleanup(() => {
  //       connected.socketName = null;
  //     });

  //     return connected;
  //   });

  //   const Channel = Resource(({ use }) => {
  //     const socket = use(Socket);
  //     const messages = Cell(0);

  //     return {
  //       get description() {
  //         const { connected, socketName } = socket.current;
  //         return `${
  //           socketName ?? "disconnected"
  //         } (connected: ${connected}, messages: ${messages.current})`;
  //       },
  //       get socket() {
  //         return socket.current;
  //       },
  //       get messages() {
  //         return messages.current;
  //       },
  //       send() {
  //         messages.current++;
  //       },
  //     };
  //   });

  //   const lifetime = {};
  //   const channel = setup(Channel, { lifetime });

  //   expect(channel.current.description).toBe(
  //     "default (connected: 1, messages: 0)",
  //   );

  //   channel.current.send();
  //   expect(channel.current.description).toBe(
  //     "default (connected: 1, messages: 1)",
  //   );

  //   name.set("socketa");
  //   expect(channel.current.description).toBe(
  //     "socketa (connected: 2, messages: 1)",
  //   );
  // });

  // test("inner use() consuming reactive state and returning a blueprint", () => {
  //   const salutation = Cell("Mr.");
  //   const invalidateOuter = Marker();
  //   const counts = {
  //     inner: 0,
  //     outer: 0,
  //   };

  //   function Greeting(name: Cell<string>) {
  //     return Resource(({ use }) => {
  //       counts.outer++;
  //       invalidateOuter.read();

  //       const sal = use(() => {
  //         counts.inner++;
  //         return salutation.current;
  //       });

  //       return CachedFormula(() => `${sal.current} ${name.current}`);
  //     });
  //   }

  //   const name = Cell("Person");

  //   const lifetime = {};
  //   const greeting = setup(Greeting(name), { lifetime });

  //   expect(greeting.current).toBe("Mr. Person");
  //   expect(counts).toEqual({ inner: 1, outer: 1 });

  //   name.current = "Persona";
  //   expect(greeting.current).toBe("Mr. Persona");
  //   expect(counts).toEqual({ inner: 1, outer: 1 });

  //   salutation.current = "Mx.";
  //   expect(greeting.current).toBe("Mx. Persona");
  //   // The outer resource *constructor* does not have a dependency on the
  //   // inner resource, since the outer resource doesn't read the value of the
  //   // inner resource during construction. The outer resource *value*, on the
  //   // other hand, does depend on the inner resource, so re-evaluating
  //   // `greeting` causes the inner resource to be re-initialized.
  //   //
  //   // You can see that this is the correct behavior by observing that the only
  //   // way to directly check whether the `salutation` cell was reflected
  //   // correctly is by checking the value of the `greeting` resource, which is
  //   // the exact check that caused the inner resource to be re-initialized.
  //   expect(counts).toEqual({ inner: 2, outer: 1 });

  //   invalidateOuter.mark();
  //   expect(greeting.current).toBe("Mx. Persona");
  //   expect(counts).toEqual({ inner: 3, outer: 2 });

  //   name.current = "Persone";
  //   expect(greeting.current).toBe("Mx. Persone");
  //   expect(counts).toEqual({ inner: 3, outer: 2 });
  // });

  // test("inner use() returning a blueprint", () => {
  //   const name = Cell("default");
  //   let connectedCount = 0;
  //   function Socket(name: Cell<string>) {
  //     return Resource(({ on }) => {
  //       const connected = {
  //         socketName: name.current as string | null,
  //         connected: ++connectedCount,
  //       };

  //       on.cleanup(() => {
  //         connected.socketName = null;
  //       });

  //       return connected;
  //     });
  //   }

  //   const Channel = Resource(({ use }) => {
  //     const socket = use(() => Socket(name));
  //     const messages = Cell(0);

  //     return {
  //       get description() {
  //         const { connected, socketName } = socket.current;
  //         return `${
  //           socketName ?? "disconnected"
  //         } (connected: ${connected}, messages: ${messages.current})`;
  //       },
  //       get socket() {
  //         return socket.current;
  //       },
  //       get messages() {
  //         return messages.current;
  //       },
  //       send() {
  //         messages.current++;
  //       },
  //     };
  //   });

  //   const lifetime = {};
  //   const channel = setup(Channel, { lifetime });

  //   expect(channel.current.description).toBe(
  //     "default (connected: 1, messages: 0)",
  //   );

  //   channel.current.send();
  //   expect(channel.current.description).toBe(
  //     "default (connected: 1, messages: 1)",
  //   );

  //   name.set("socketa");
  //   expect(channel.current.description).toBe(
  //     "socketa (connected: 2, messages: 1)",
  //   );
  // });

  // test("inline child resources", () => {
  //   const name = Cell("default");
  //   let connectedCount = 0;

  //   const Channel = Resource(({ use }) => {
  //     const socket = use(({ on }) => {
  //       const connected = {
  //         socketName: name.current as string | null,
  //         connected: ++connectedCount,
  //       };

  //       on.cleanup(() => {
  //         connected.socketName = null;
  //       });

  //       return connected;
  //     });
  //     const messages = Cell(0);

  //     return {
  //       get description() {
  //         const { connected, socketName } = socket.current;
  //         return `${
  //           socketName ?? "disconnected"
  //         } (connected: ${connected}, messages: ${messages.current})`;
  //       },
  //       get socket() {
  //         return socket.current;
  //       },
  //       get messages() {
  //         return messages.current;
  //       },
  //       send() {
  //         messages.current++;
  //       },
  //     };
  //   });

  //   const lifetime = {};
  //   const channel = setup(Channel, { lifetime });

  //   expect(channel.current.description).toBe(
  //     "default (connected: 1, messages: 0)",
  //   );

  //   channel.current.send();
  //   expect(channel.current.description).toBe(
  //     "default (connected: 1, messages: 1)",
  //   );

  //   name.set("socketa");
  //   expect(channel.current.description).toBe(
  //     "socketa (connected: 2, messages: 1)",
  //   );
  // });

  // test("external resources", () => {
  //   const childResource = new TestResource();
  //   const child = childResource.instance;

  //   const invalidateParent = Marker();
  //   const parentCounts = { init: 0, cleanup: 0 };

  //   const Parent = Resource(({ on }) => {
  //     invalidateParent.read();
  //     parentCounts.init++;

  //     on.cleanup(() => {
  //       parentCounts.cleanup++;
  //     });

  //     return {
  //       get child() {
  //         return child.current.state;
  //       },
  //       increment() {
  //         child.current.increment();
  //       },
  //     };
  //   });

  //   const lifetime = {};
  //   const parent = setup(Parent, {
  //     lifetime,
  //   });

  //   function getState() {
  //     return {
  //       child: parent.current.child,
  //       parent: {
  //         ...parentCounts,
  //       },
  //     };
  //   }

  //   expect(getState()).toEqual({
  //     parent: {
  //       init: 1,
  //       cleanup: 0,
  //     },

  //     child: {
  //       count: 0,
  //       init: 1,
  //       finalized: 0,
  //     },
  //   });

  //   // invalidating the parent should not invalidate the child (it gets adopted
  //   // by the new run).
  //   invalidateParent.mark();

  //   expect(getState()).toEqual({
  //     parent: {
  //       init: 2,
  //       cleanup: 1,
  //     },
  //     child: {
  //       count: 0,
  //       init: 1,
  //       finalized: 0,
  //     },
  //   });

  //   parent.current.increment();

  //   expect(getState()).toEqual({
  //     parent: {
  //       init: 2,
  //       cleanup: 1,
  //     },
  //     child: {
  //       count: 1,
  //       init: 1,
  //       finalized: 0,
  //     },
  //   });
  // });

  // test("modifying a resource constructor's dependency after it was finalized doesn't cause it to run again", () => {
  //   const counts = { init: 0, finalized: 0 };
  //   const invalidate = Marker();

  //   const Counter = Resource(({ on }) => {
  //     const counter = Cell(0);

  //     on.setup(() => {
  //       invalidate.read();
  //       counts.init++;

  //       return () => {
  //         counts.finalized++;
  //       };
  //     });

  //     return {
  //       get count() {
  //         return counter.current;
  //       },
  //       increment() {
  //         counter.current++;
  //       },
  //     };
  //   });

  //   const lifetime = {};
  //   const counter = setup(Counter, { lifetime });

  //   expect(counter.current.count).toBe(0);
  //   expect(counts).toEqual({ init: 1, finalized: 0 });

  //   counter.current.increment();
  //   expect(counter.current.count).toBe(1);
  //   expect(counts).toEqual({ init: 1, finalized: 0 });

  //   invalidate.mark();
  //   expect(counter.current.count).toBe(1);
  //   expect(counts).toEqual({ init: 2, finalized: 1 });

  //   counter.current.increment();
  //   expect(counter.current.count).toBe(2);
  //   expect(counts).toEqual({ init: 2, finalized: 1 });

  //   finalize(lifetime);
  //   expect(counts).toEqual({ init: 2, finalized: 2 });

  //   // modifying the dependency after the resource was finalized should not
  //   // cause it to run again
  //   invalidate.mark();
  //   expect(counts).toEqual({ init: 2, finalized: 2 });
  // });
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
   * we should allow that to be configured when the {@linkcode ResourceWrapper} is
   * created.)
   */
  events: string[];
  change: (prev: U) => U;
  afterAction: Expectations<U> | undefined;
  afterSync: Expectations<U> | undefined;
  cause: Error | undefined;
}

class ResourceWrapper<T, U> {
  static use<T, U>(
    blueprint: ResourceBlueprint<T>,
    {
      events,
      subject,
      label,
    }: { events: RecordedEvents; subject: (value: T) => U; label?: string },
  ): PostAssertion<U, ResourceWrapper<T, U>> {
    const cause = buildCause(ResourceWrapper.use);

    const [lifetime, instance] = entryPoint(
      () => {
        events.expect([]);
        return pushingScope(blueprint);
      },
      {
        entryFn: ResourceWrapper.use,
        cause,
      },
    );

    const processedLabel = label
      ? label
      : blueprint.name
      ? blueprint.name
      : undefined;

    const wrapper = new ResourceWrapper(
      processedLabel ?? "{anonymous resource}",
      lifetime,
      instance,
      events,
      subject,
    );

    const expectFn = (expected: Expectations<U>) => {
      wrapper.#expect(
        expected,
        processedLabel ? `use ${processedLabel}` : "use",
      );
      return wrapper;
    };

    return { expect: expectFn };
  }

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
   * - `events`: The events expected to be recorded when the action runs. (default: `[]`)
   * - `change`: A function that takes the previous value and returns the
   *   expected new value. (default: {@linkcode UNCHANGED})
   * - `sync`: Optionally, the parameter to the {@linkcode sync} method. This parameter
   *   will be passed to the call to the {@linkcode sync} method that occurs after the
   *   action is run. If no `sync` parameter is provided, the {@linkcode act} call will
   *   assert {@linkcode UNCHANGED}.
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
        cause: action.cause,
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

    const expectFn = (options: Expectations<U>, label?: string) => {
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

  #expect = (expectations: Expectations<U>, label: string) => {
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
