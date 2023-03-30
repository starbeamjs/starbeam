import { Marker } from "@starbeam/reactive";
import {
  Cell,
  LIFETIME,
  Resource3 as Resource,
  type ResourceBlueprint3,
} from "@starbeam/universal";
import { describe, expect, test } from "vitest";

describe("v3::resources", () => {
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
    const channel = Channel.create({ lifetime });

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

  test("adopting resources", () => {
    const childResource = new TestResource();
    const child = childResource.instance;

    const invalidateParent = Marker();

    const Parent = Resource(
      ({ use }, { metadata: meta }: { metadata: { initHere: number } }) => {
        const resource = use(child);
        invalidateParent.read();
        meta.initHere++;

        return {
          get state() {
            return {
              child: resource.current.state,
              parent: {
                init: meta.initHere,
              },
            };
          },
          increment() {
            resource.current.increment();
          },
        };
      }
    );

    const lifetime = {};
    const parent = Parent.create({
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
  readonly #blueprint: ResourceBlueprint3<TestInstance>;
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

    this.#instance = this.#blueprint.create({ lifetime: this.#lifetime });
  }

  get instance(): Resource<TestInstance> {
    return this.#instance;
  }

  invalidateConstructor(): void {
    this.#marker.mark();
  }

  finalize(): void {
    LIFETIME.finalize(this.#lifetime);
  }
}
