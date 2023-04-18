import { CachedFormula, Cell, Marker } from "@starbeam/reactive";
import { Resource, type ResourceBlueprint, use } from "@starbeam/resource";
import { RUNTIME } from "@starbeam/runtime";
import { describe, expect, test } from "vitest";

describe("resources", () => {
  test("the basics", () => {
    const testResource = new TestResource();
    const resource = testResource.instance;

    expect(resource.current.state).toEqual({
      count: 0,
      init: 1,
      finalized: 0,
    });

    testResource.invalidateConstructor();
    expect(resource.current.state).toEqual({
      count: 0,
      init: 2,
      finalized: 1,
    });

    resource.current.increment();
    expect(resource.current.state).toEqual({
      count: 1,
      init: 2,
      finalized: 1,
    });

    testResource.invalidateConstructor();
    expect(resource.current.state).toEqual({
      count: 0,
      init: 3,
      finalized: 2,
    });

    testResource.finalize();
    expect(resource.current.state).toEqual({
      count: 0,
      init: 3,
      finalized: 3,
    });
  });

  test("if a resource constructor returns a reactive value, it is assimilated", () => {
    const initial = Cell(0);
    const plus = Cell(0);
    const counts = { init: 0, finalized: 0 };
    const Test = Resource(({ on }) => {
      counts.init++;
      const cell = Cell(initial.current);

      on.cleanup(() => {
        counts.finalized++;
      });

      return CachedFormula(() => cell.current + plus.current);
    });

    const lifetime = {};
    const test = use(Test, { lifetime });

    expect(test.current).toBe(0);
    expect(counts).toEqual({ init: 1, finalized: 0 });

    plus.current++;
    expect(test.current).toBe(1);
    expect(counts).toEqual({ init: 1, finalized: 0 });

    initial.current++;
    expect(test.current).toBe(2);
    expect(counts).toEqual({ init: 2, finalized: 1 });
  });

  test("a counter that persists across cleanups", () => {
    const counts = { init: 0, finalized: 0 };
    const invalidate = Marker();
    const Counter = Resource(({ on }, count: Cell<number>) => {
      invalidate.read();
      counts.init++;

      on.cleanup(() => {
        counts.finalized++;
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

    const lifetime = {};
    const counter = use(Counter, { lifetime, metadata: Cell(0) });

    expect(counter.current.count).toBe(0);
    expect(counts).toEqual({ init: 1, finalized: 0 });

    counter.current.increment();
    expect(counter.current.count).toBe(1);
    expect(counts).toEqual({ init: 1, finalized: 0 });

    invalidate.mark();
    expect(counter.current.count).toBe(1);
    expect(counts).toEqual({ init: 2, finalized: 1 });

    counter.current.increment();
    expect(counter.current.count).toBe(2);
    expect(counts).toEqual({ init: 2, finalized: 1 });
  });

  test("child resources", () => {
    const name = Cell("default");
    let connectedCount = 0;
    const Socket = Resource(({ on }) => {
      const connected = {
        socketName: name.current as string | null,
        connected: ++connectedCount,
      };

      on.cleanup(() => {
        connected.socketName = null;
      });

      return connected;
    });

    const Channel = Resource(({ use }) => {
      const socket = use(Socket);
      const messages = Cell(0);

      return {
        get description() {
          const { connected, socketName } = socket.current;
          return `${
            socketName ?? "disconnected"
          } (connected: ${connected}, messages: ${messages.current})`;
        },
        get socket() {
          return socket.current;
        },
        get messages() {
          return messages.current;
        },
        send() {
          messages.current++;
        },
      };
    });

    const lifetime = {};
    const channel = use(Channel, { lifetime });

    expect(channel.current.description).toBe(
      "default (connected: 1, messages: 0)"
    );

    channel.current.send();
    expect(channel.current.description).toBe(
      "default (connected: 1, messages: 1)"
    );

    name.set("socketa");
    expect(channel.current.description).toBe(
      "socketa (connected: 2, messages: 1)"
    );
  });

  test("inner use() consuming reactive state and returning a blueprint", () => {
    const salutation = Cell("Mr.");
    const invalidateOuter = Marker();
    const counts = {
      inner: 0,
      outer: 0,
    };

    function Greeting(name: Cell<string>) {
      return Resource(({ use }) => {
        counts.outer++;
        invalidateOuter.read();

        const sal = use(() => {
          counts.inner++;
          return salutation.current;
        });

        return CachedFormula(() => `${sal.current} ${name.current}`);
      });
    }

    const name = Cell("Person");

    const lifetime = {};
    const greeting = use(Greeting(name), { lifetime });

    expect(greeting.current).toBe("Mr. Person");
    expect(counts).toEqual({ inner: 1, outer: 1 });

    name.current = "Persona";
    expect(greeting.current).toBe("Mr. Persona");
    expect(counts).toEqual({ inner: 1, outer: 1 });

    salutation.current = "Mx.";
    expect(greeting.current).toBe("Mx. Persona");
    // The outer resource *constructor* does not have a dependency on the
    // inner resource, since the outer resource doesn't read the value of the
    // inner resource during construction. The outer resource *value*, on the
    // other hand, does depend on the inner resource, so re-evaluating
    // `greeting` causes the inner resource to be re-initialized.
    //
    // You can see that this is the correct behavior by observing that the only
    // way to directly check whether the `salutation` cell was reflected
    // correctly is by checking the value of the `greeting` resource, which is
    // the exact check that caused the inner resource to be re-initialized.
    expect(counts).toEqual({ inner: 2, outer: 1 });

    invalidateOuter.mark();
    expect(greeting.current).toBe("Mx. Persona");
    expect(counts).toEqual({ inner: 3, outer: 2 });

    name.current = "Persone";
    expect(greeting.current).toBe("Mx. Persone");
    expect(counts).toEqual({ inner: 3, outer: 2 });
  });

  test("inner use() returning a blueprint", () => {
    const name = Cell("default");
    let connectedCount = 0;
    function Socket(name: Cell<string>) {
      return Resource(({ on }) => {
        const connected = {
          socketName: name.current as string | null,
          connected: ++connectedCount,
        };

        on.cleanup(() => {
          connected.socketName = null;
        });

        return connected;
      });
    }

    const Channel = Resource(({ use }) => {
      const socket = use(() => Socket(name));
      const messages = Cell(0);

      return {
        get description() {
          const { connected, socketName } = socket.current;
          return `${
            socketName ?? "disconnected"
          } (connected: ${connected}, messages: ${messages.current})`;
        },
        get socket() {
          return socket.current;
        },
        get messages() {
          return messages.current;
        },
        send() {
          messages.current++;
        },
      };
    });

    const lifetime = {};
    const channel = use(Channel, { lifetime });

    expect(channel.current.description).toBe(
      "default (connected: 1, messages: 0)"
    );

    channel.current.send();
    expect(channel.current.description).toBe(
      "default (connected: 1, messages: 1)"
    );

    name.set("socketa");
    expect(channel.current.description).toBe(
      "socketa (connected: 2, messages: 1)"
    );
  });

  test("inline child resources", () => {
    const name = Cell("default");
    let connectedCount = 0;

    const Channel = Resource(({ use }) => {
      const socket = use(({ on }) => {
        const connected = {
          socketName: name.current as string | null,
          connected: ++connectedCount,
        };

        on.cleanup(() => {
          connected.socketName = null;
        });

        return connected;
      });
      const messages = Cell(0);

      return {
        get description() {
          const { connected, socketName } = socket.current;
          return `${
            socketName ?? "disconnected"
          } (connected: ${connected}, messages: ${messages.current})`;
        },
        get socket() {
          return socket.current;
        },
        get messages() {
          return messages.current;
        },
        send() {
          messages.current++;
        },
      };
    });

    const lifetime = {};
    const channel = use(Channel, { lifetime });

    expect(channel.current.description).toBe(
      "default (connected: 1, messages: 0)"
    );

    channel.current.send();
    expect(channel.current.description).toBe(
      "default (connected: 1, messages: 1)"
    );

    name.set("socketa");
    expect(channel.current.description).toBe(
      "socketa (connected: 2, messages: 1)"
    );
  });

  test("external resources", () => {
    const childResource = new TestResource();
    const child = childResource.instance;

    const invalidateParent = Marker();

    const Parent = Resource((_, meta: { initHere: number }) => {
      invalidateParent.read();
      meta.initHere++;

      return {
        get state() {
          return {
            child: child.current.state,
            parent: {
              init: meta.initHere,
            },
          };
        },
        increment() {
          child.current.increment();
        },
      };
    });

    const lifetime = {};
    const parent = use(Parent, {
      lifetime,
      metadata: {
        initHere: 0,
      },
    });

    expect(parent.current.state).toEqual({
      parent: {
        init: 1,
      },
      child: {
        count: 0,
        init: 1,
        finalized: 0,
      },
    });

    // invalidating the parent should not invalidate the child (it gets adopted
    // by the new run).
    invalidateParent.mark();

    expect(parent.current.state).toEqual({
      parent: {
        init: 2,
      },
      child: {
        count: 0,
        init: 1,
        finalized: 0,
      },
    });

    parent.current.increment();

    expect(parent.current.state).toEqual({
      parent: {
        init: 2,
      },
      child: {
        count: 1,
        init: 1,
        finalized: 0,
      },
    });
  });

  test("modifying a resource constructor's dependency after it was finalized doesn't cause it to run again", () => {
    const counts = { init: 0, finalized: 0 };
    const invalidate = Marker();

    const Counter = Resource(({ on }, count: Cell<number>) => {
      invalidate.read();
      counts.init++;

      on.cleanup(() => {
        counts.finalized++;
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

    const lifetime = {};
    const counter = use(Counter, { lifetime, metadata: Cell(0) });

    expect(counter.current.count).toBe(0);
    expect(counts).toEqual({ init: 1, finalized: 0 });

    counter.current.increment();
    expect(counter.current.count).toBe(1);
    expect(counts).toEqual({ init: 1, finalized: 0 });

    invalidate.mark();
    expect(counter.current.count).toBe(1);
    expect(counts).toEqual({ init: 2, finalized: 1 });

    counter.current.increment();
    expect(counter.current.count).toBe(2);
    expect(counts).toEqual({ init: 2, finalized: 1 });

    RUNTIME.finalize(lifetime);
    expect(counts).toEqual({ init: 2, finalized: 2 });

    // modifying the dependency after the resource was finalized should not
    // cause it to run again
    invalidate.mark();
    expect(counts).toEqual({ init: 2, finalized: 2 });
  });
});

interface TestInstance {
  readonly state: {
    readonly init: number;
    readonly finalized: number;
    readonly count: number;
  };
  increment: () => void;
}

class TestResource {
  readonly #lifetime: object;
  readonly #marker: Marker;
  readonly #blueprint: ResourceBlueprint<TestInstance, void>;
  readonly #instance: Resource<TestInstance>;

  constructor() {
    this.#lifetime = {};
    const marker = (this.#marker = Marker());
    const state = {
      counts: {
        init: 0,
        finalized: 0,
      },
    };

    this.#blueprint = Resource(({ on }) => {
      state.counts.init++;

      const cell = Cell(0);
      marker.read();
      on.cleanup(() => {
        state.counts.finalized++;
      });

      return {
        get state() {
          return {
            ...state.counts,
            count: cell.current,
          };
        },
        increment() {
          cell.current++;
        },
      };
    });

    this.#instance = use(this.#blueprint, { lifetime: this.#lifetime });
  }

  get instance(): Resource<TestInstance> {
    return this.#instance;
  }

  invalidateConstructor(): void {
    this.#marker.mark();
  }

  finalize(): void {
    RUNTIME.finalize(this.#lifetime);
  }
}
