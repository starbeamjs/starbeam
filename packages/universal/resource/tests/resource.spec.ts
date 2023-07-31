import { Cell, type FormulaFn, Marker } from "@starbeam/reactive";
import type { ResourceBlueprint, Sync } from "@starbeam/resource";
import { Resource, SyncTo, use } from "@starbeam/resource";
import { type FinalizationScope, pushingScope } from "@starbeam/runtime";
import { finalize, mountFinalizationScope } from "@starbeam/shared";
import {
  Actions,
  describe,
  entryPoint,
  expect,
  test,
} from "@starbeam-workspace/test-utils";

describe("resources", () => {
  test("a manual resource built on Sync", () => {
    const actions = new Actions();
    const invalidate = Marker();

    function Counter() {
      actions.record("resource:setup");
      const counter = Cell(0);

      const sync = SyncTo(({ on }) => {
        actions.record("sync:setup");

        on.sync(() => {
          actions.record("sync:sync");
          invalidate.read();

          return () => {
            actions.record("sync:cleanup");
          };
        });

        on.finalize(() => {
          actions.record("sync:finalize");
        });
      })();

      return {
        sync,
        counter: {
          get count() {
            return counter.current;
          },
          increment() {
            actions.record("increment");
            counter.update((i) => i + 1);
          },
        },
      };
    }

    actions.expect([]);

    const [scope, { sync, counter }] = pushingScope(() => Counter());
    actions.expect("resource:setup", "sync:setup");
    expect(counter.count).toBe(0);

    counter.increment();
    actions.expect("increment");
    expect(counter.count).toBe(1);

    counter.increment();
    actions.expect("increment");
    expect(counter.count).toBe(2);

    sync();
    actions.expect("sync:sync");
    expect(counter.count).toBe(2);

    sync();
    actions.expect([]);
    expect(counter.count).toBe(2);

    counter.increment();
    actions.expect("increment");
    expect(counter.count).toBe(3);

    counter.increment();
    actions.expect("increment");
    expect(counter.count).toBe(4);

    // invalidate the sync formula but don't synchronize yet
    invalidate.mark();
    actions.expect([]);
    expect(counter.count, "the count before synchronization").toBe(4);

    sync();
    actions.expect("sync:cleanup", "sync:sync");
    // synchronization shouldn't have replaced the cell
    expect(counter.count).toBe(4);

    sync();
    actions.expect([]);
    expect(counter.count).toBe(4);

    finalize(scope);
    actions.expect("sync:cleanup", "sync:finalize");
    expect(counter.count).toBe(4);

    finalize(scope);
    actions.expect([]);
    expect(counter.count).toBe(4);

    invalidate.mark();
    actions.expect([]);
    expect(counter.count).toBe(4);

    sync();
    actions.expect([]);
    expect(counter.count).toBe(4);

    finalize(scope);
    actions.expect([]);
    expect(counter.count).toBe(4);
  });

  test("A simple Resource", () => {
    const actions = new Actions();
    const invalidate = Marker();

    const Counter = Resource(({ on }) => {
      actions.record("resource:setup");
      const counter = Cell(0);

      on.sync(() => {
        actions.record("sync:sync");
        invalidate.read();

        return () => {
          actions.record("sync:cleanup");
        };
      });

      on.finalize(() => {
        actions.record("sync:finalize");
      });

      return {
        get count() {
          return counter.current;
        },
        increment() {
          actions.record("increment");
          counter.update((i) => i + 1);
        },
      };
    });

    actions.expect([]);
    const [scope, { sync, value: counter }] = pushingScope(() => use(Counter));

    actions.expect("resource:setup");
    expect(counter.count).toBe(0);

    counter.increment();
    actions.expect("increment");
    expect(counter.count).toBe(1);

    counter.increment();
    actions.expect("increment");
    expect(counter.count).toBe(2);

    sync();
    actions.expect("sync:sync");
    expect(counter.count).toBe(2);

    sync();
    actions.expect([]);
    expect(counter.count).toBe(2);

    counter.increment();
    actions.expect("increment");
    expect(counter.count).toBe(3);

    counter.increment();
    actions.expect("increment");
    expect(counter.count).toBe(4);

    // invalidate the sync formula but don't synchronize yet
    invalidate.mark();
    actions.expect([]);
    expect(counter.count, "the count before synchronization").toBe(4);

    sync();
    actions.expect("sync:cleanup", "sync:sync");
    // synchronization shouldn't have replaced the cell
    expect(counter.count).toBe(4);

    sync();
    actions.expect([]);
    expect(counter.count).toBe(4);

    finalize(scope);
    actions.expect("sync:cleanup", "sync:finalize");
    expect(counter.count).toBe(4);

    finalize(scope);
    actions.expect([]);
    expect(counter.count).toBe(4);

    invalidate.mark();
    actions.expect([]);
    expect(counter.count).toBe(4);

    sync();
    actions.expect([]);
    expect(counter.count).toBe(4);

    finalize(scope);
    actions.expect([]);
    expect(counter.count).toBe(4);
  });

  // test("the basics", () => {
  //   const actions = new Actions();
  //   const testResource = new TestResource(actions);
  //   actions.expect("init");

  //   actions.expect([]);
  //   testResource.sync().expect("setup");

  //   testResource.invalidateSetup();
  //   testResource.sync().expect("cleanup", "setup");
  //   expect(testResource.count).toBe(0);

  //   testResource.value.increment();
  //   actions.expect([]);
  //   expect(testResource.count).toBe(1);

  //   testResource.invalidateSetup();
  //   testResource.sync().expect("cleanup", "setup");
  //   // the resource's state hasn't changed
  //   expect(testResource.count).toBe(1);

  //   testResource.value.increment();
  //   actions.expect([]);
  //   expect(testResource.count).toBe(2);

  //   testResource.finalize();
  //   expect(testResource.count).toBe(2);

  //   testResource.finalize({ expect: "noop" });
  //   expect(testResource.count).toBe(2);

  //   // this won't do anything because the `increment` method emulates a resource
  //   // whose updates are happening via the process set up in `setup`.
  //   testResource.value.increment();
  //   actions.expect([]);
  //   expect(testResource.count).toBe(2);

  //   testResource.finalize({ expect: "noop" });
  //   expect(testResource.count).toBe(2);
  //   actions.expect([]);
  // });

  // test("on.cleanup only runs when the resource is finally cleaned up", () => {
  //   const actions = new Actions();
  //   const invalidate = Marker();

  //   const TestResource = Resource(({ on }) => {
  //     actions.record("init");
  //     const cell = Cell(0);

  //     on.finalize(() => {
  //       actions.record("finalize");
  //     });

  //     on.setup(() => {
  //       actions.record("setup");
  //       invalidate.read();
  //       cell.current++;

  //       return () => {
  //         actions.record("cleanup");
  //       };
  //     });

  //     return cell;
  //   });

  //   const resource = ResourceWrapper.use(TestResource, actions);
  //   actions.expect("init");

  //   const { value, sync, finalize } = resource;
  //   expect(value.current).toBe(0);

  //   sync().expect("setup");
  //   expect(value.current).toBe(1);

  //   sync().expect([]);
  //   expect(value.current).toBe(1);

  //   invalidate.mark();
  //   actions.expect([]);
  //   expect(value.current, "the value before sync has occurred").toBe(1);
  //   sync().expect("cleanup", "setup");

  //   invalidate.mark();
  //   actions.expect([]);
  //   expect(value.current, "the value after sync has occurred").toBe(2);
  //   sync().expect("cleanup", "setup");

  //   finalize({ afterActions: ["finalize"] });
  // });

  // test("if a resource constructor returns a reactive value, it is assimilated", () => {
  //   const actions = new Actions();
  //   const initial = Cell(0);
  //   const plus = Cell(0);
  //   const Test = Resource(({ on }) => {
  //     actions.record("init");
  //     const cell = Cell(initial.current);

  //     on.setup(() => {
  //       actions.record("setup");
  //       cell.current = initial.current;

  //       return () => void actions.record("cleanup");
  //     });

  //     return CachedFormula(() => cell.current + plus.current);
  //   });

  //   const resource = ResourceWrapper.use(Test, actions);
  //   const { value, sync, finalize } = resource;

  //   actions.expect("init");

  //   plus.current++;
  //   expect(value.current).toBe(1);
  //   actions.expect([]);

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

  // test("a counter that persists across cleanups", () => {
  //   const actions = new Actions();
  //   const invalidateSetup = Marker();

  //   const Counter = Resource(({ on }) => {
  //     actions.record("init");

  //     const count = Cell(0);

  //     on.setup(() => {
  //       actions.record("setup");
  //       invalidateSetup.read();

  //       return () => {
  //         actions.record("cleanup");
  //       };
  //     });

  //     on.finalize(() => {
  //       actions.record("finalize");
  //     });

  //     return {
  //       get count() {
  //         return count.current;
  //       },
  //       increment() {
  //         count.current++;
  //       },
  //     };
  //   });

  //   const resource = ResourceWrapper.use(Counter, actions);
  //   const { value: counter, finalize, sync } = resource;

  //   expect(counter.count).toBe(0);
  //   actions.expect("init");

  //   sync().expect("setup");
  //   sync().expect([]);

  //   counter.increment();
  //   expect(counter.count).toBe(1);

  //   sync().expect([]);

  //   // incrementing the counter doesn't invalidate the setups
  //   counter.increment();
  //   expect(counter.count).toBe(2);

  //   invalidateSetup.mark();
  //   // invalidating the setups doesn't reset the constructor
  //   expect(counter.count).toBe(2);
  //   sync().expect("cleanup", "setup");
  //   expect(counter.count).toBe(2);

  //   counter.increment();
  //   expect(counter.count).toBe(3);
  //   sync().expect([]);

  //   invalidateSetup.mark();
  //   // invalidating the setups doesn't reset the constructor
  //   expect(counter.count).toBe(3);
  //   sync().expect("cleanup", "setup");
  //   expect(counter.count).toBe(3);

  //   finalize({ afterActions: ["finalize"] });
  //   expect(counter.count).toBe(3);

  //   finalize({ expect: "noop" });

  //   invalidateSetup.mark();
  //   sync().expect([]);

  //   finalize({ expect: "noop" });
  //   sync().expect([]);
  //   expect(counter.count).toBe(3);
  // });

  // test("child resources", () => {
  //   const actions = new Actions();
  //   const invalidateChild = Marker();
  //   const invalidateParent = Marker();

  //   const Child = Resource(({ on }) => {
  //     actions.record("child:init");
  //     const count = Cell(0);

  //     on.setup(() => {
  //       actions.record("child:setup");
  //       invalidateChild.read();

  //       return () => {
  //         actions.record("child:cleanup");
  //       };
  //     });

  //     on.finalize(() => {
  //       actions.record("child:finalize");
  //     });

  //     return {
  //       get count() {
  //         return count.current;
  //       },
  //       increment() {
  //         count.current++;
  //       },
  //     };
  //   });

  //   const Parent = Resource(({ use, on }) => {
  //     actions.record("parent:init");
  //     const child = use(Child);

  //     on.setup(() => {
  //       actions.record("parent:setup");
  //       invalidateParent.read();

  //       return () => {
  //         actions.record("parent:cleanup");
  //       };
  //     });

  //     on.finalize(() => {
  //       actions.record("parent:finalize");
  //     });

  //     return {
  //       get childCount() {
  //         return child.count;
  //       },
  //       incrementChild() {
  //         child.increment();
  //       },
  //     };
  //   });

  //   const resource = ResourceWrapper.use(Parent, actions);

  //   const { value: parent, sync, finalize } = resource;

  //   // initialization happens in source order
  //   actions.expect("parent:init", "child:init");
  //   expect(parent.childCount).toBe(0);

  //   // child setup happens before parent setup
  //   sync().expect("child:setup", "parent:setup");

  //   // incrementing the child doesn't affect any of the setups.
  //   parent.incrementChild();
  //   expect(parent.childCount).toBe(1);
  //   sync().expect([]);

  //   invalidateChild.mark();

  //   // nothing happens until synchronization
  //   actions.expect([]);

  //   sync().expect("child:cleanup", "child:setup");
  // });

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

class ResourceWrapper<T> {
  static use<T>(
    blueprint: ResourceBlueprint<T>,
    actions: Actions,
  ): ResourceWrapper<T> {
    entryPoint(
      () => {
        actions.expect([]);
      },
      {
        entryFn: ResourceWrapper.use,
      },
    );

    return new ResourceWrapper(blueprint, actions);
  }

  readonly #value: T;
  readonly #sync: Sync;
  readonly #lifetime: FinalizationScope;
  readonly #actions: Actions;

  constructor(blueprint: ResourceBlueprint<T>, actions: Actions) {
    const [lifetime, instance] = pushingScope(() => use(blueprint));

    this.#value = getValue(instance);
    this.#sync = getSync(instance)();
    this.#lifetime = lifetime;
    this.#actions = actions;
  }

  get value(): T {
    return this.#value;
  }

  sync = (): { expect: (...args: [[]] | string[]) => void } => {
    entryPoint(
      () => {
        this.#actions.expect([]);
        this.#sync();
      },
      { entryFn: this.sync },
    );

    const expect = (...args: [[]] | string[]) => {
      entryPoint(
        () => {
          this.#actions.expect(...args);
        },
        { entryFn: expect },
      );
    };

    return { expect };
  };

  finalize = (
    options?: { expect: "noop" } | { afterActions: string[] },
  ): void => {
    finalize(this.#lifetime);

    entryPoint(
      () => {
        if (options === undefined) {
          this.#actions.expect("cleanup");
        } else if ("expect" in options) {
          this.#actions.expect([]);
        } else {
          this.#actions.expect("cleanup", ...options.afterActions);
        }
      },
      {
        entryFn: this.finalize,
      },
    );
  };
}

interface TestInstance {
  readonly state: {
    readonly count: number;
  };
  increment: () => void;
}

class TestResource {
  readonly #actions: Actions;
  readonly #lifetime: object;
  readonly #marker: Marker;
  readonly #blueprint: ResourceBlueprint<TestInstance>;
  readonly #resource: Resource<TestInstance>;
  readonly #sync: FormulaFn<void>;

  constructor(actions: Actions) {
    this.#actions = actions;
    this.#lifetime = {};
    const marker = (this.#marker = Marker());
    const state = {
      counts: {
        init: 0,
        finalized: 0,
      },
    };

    this.#blueprint = Resource(({ on }) => {
      const cell = Cell(0);
      let finalized = false;
      actions.record("init");

      on.setup(() => {
        finalized = false;
        actions.record("setup");
        marker.read();

        return () => {
          finalized = true;
          actions.record("cleanup");
        };
      });

      return {
        get state() {
          return {
            ...state.counts,
            count: cell.current,
          };
        },
        increment() {
          // emulate the count coming from the resource's setup (like an active channel)
          if (finalized) return;
          cell.current++;
        },
      };
    });

    const done = mountFinalizationScope(this.#lifetime);
    this.#resource = use(this.#blueprint);
    this.#sync = getSync(this.#resource)(this.#lifetime);
    done();
  }

  sync(): { expect: (...args: [[]] | string[]) => void } {
    entryPoint(
      () => {
        this.#actions.expect([]);
        this.#sync();
      },
      { entryFn: this.sync },
    );

    const expect = (...args: [[]] | string[]) => {
      entryPoint(
        () => {
          this.#actions.expect(...args);
        },
        { entryFn: expect },
      );
    };

    return { expect };
  }

  get value(): TestInstance {
    return getValue(this.#resource);
  }

  get count(): number {
    return this.value.state.count;
  }

  invalidateSetup(): void {
    this.#marker.mark();

    entryPoint(
      () => {
        this.#actions.expect([]);
      },
      { entryFn: this.invalidateSetup },
    );
  }

  finalize(options?: { expect: "noop" }): void {
    finalize(this.#lifetime);

    entryPoint(
      () => {
        if (options?.expect === "noop") {
          this.#actions.expect([]);
        } else {
          this.#actions.expect("cleanup");
        }
      },
      {
        entryFn: this.finalize,
      },
    );
  }
}
