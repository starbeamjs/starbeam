import {
  Cell,
  FormulaFn,
  LIFETIME,
  Resource,
  ResourceFn,
} from "@starbeam/core";
import type { Reactive } from "@starbeam/interfaces";
import { describe, expect, test } from "vitest";

class Subscription {
  static subscribe(name: string): Subscription {
    return new Subscription(name, true);
  }

  readonly #name: string;
  #active: boolean;

  constructor(name: string, active: boolean) {
    this.#name = name;
    this.#active = active;
  }

  get name() {
    return this.#name;
  }

  get isActive(): boolean {
    return this.#active;
  }

  disconnect() {
    this.#active = false;
  }
}

describe("ResourceFn", () => {
  test("a resource is a formula with lifetime", () => {
    const channel = Cell("emails");
    const username = Cell("@tomdale");
    const counter = Cell(0);

    const parent = {};

    interface ResourceState {
      readonly inner: string;
      readonly socket: Subscription | undefined;
      readonly description: string;
    }

    const resource: Reactive<ResourceState> = ResourceFn(({ on }) => {
      const socket = Cell(undefined as Subscription | undefined);
      const inner = Cell("did construct");

      const s = Subscription.subscribe(channel.current);
      socket.set(s);

      on.setup(() => {
        inner.set(`did setup (${counter.current})`);

        return () => {
          inner.set("did cleanup");
        };
      });

      on.cleanup(() => s.disconnect());

      return FormulaFn(() => ({
        inner: inner.current,
        socket: socket.current,
        description: `${username.current} @ ${channel.current}`,
      }));
    }).create(parent);

    class Steps {
      static start(assert: (state: ResourceState) => void): Steps {
        assert(resource.current);
        return new Steps();
      }

      #prev: ResourceState = resource.current;

      step(
        action: () => void,
        assert: (options: { prev: ResourceState; state: ResourceState }) => void
      ) {
        const prev = this.#prev;
        action();
        this.#prev = resource.current;
        assert({ prev, state: this.#prev });
        return this;
      }
    }

    Steps.start((state) => {
      expect(state.description).toBe("@tomdale @ emails");
      expect(state.socket?.name).toBe("emails");
      expect(state.inner).toBe("did construct");
    })
      .step(
        () => ResourceFn.setup(resource),
        ({ state }) => {
          expect(state.description).toBe("@tomdale @ emails");
          expect(state.socket?.name).toBe("emails");
          expect(state.inner).toBe("did setup (0)");
        }
      )
      .step(
        () => username.set("@todale"),
        ({ prev, state }) => {
          expect(state.description).toBe("@todale @ emails");
          expect(prev.socket).toBe(state.socket);
          expect(state.socket?.name).toBe("emails");
          expect(state.socket?.isActive).toBe(true);
        }
      )
      .step(
        () => counter.update((i) => i + 1),
        ({ state, prev }) => {
          expect(state.description).toBe("@todale @ emails");
          expect(state.inner).toBe("did setup (1)");
          expect(prev.socket).toBe(state.socket);
          expect(prev.socket?.name).toBe("emails");
          expect(prev.socket?.isActive).toBe(true);
        }
      )
      .step(
        () => channel.set("twitter"),
        ({ state, prev }) => {
          expect(prev.socket).not.toBe(state.socket);
          expect(prev.socket?.isActive).toBe(false);
          expect(state.description).toBe("@todale @ twitter");
          expect(state.socket?.name).toBe("twitter");
          expect(state.socket?.isActive).toBe(true);
        }
      )
      .step(
        () => LIFETIME.finalize(parent),
        ({ state: next, prev: last }) => {
          expect(next).toBe(last);
          expect(next.socket?.name).toBe("twitter");
          expect(next.socket?.isActive).toBe(false);
        }
      );
  });
});

describe("Resource", () => {
  test("a resource is a formula with lifetime", () => {
    const channel = Cell("emails");
    const username = Cell("@tomdale");

    const parent = {};

    const resource = Resource((resource) => {
      const socket = Cell(undefined as Subscription | undefined);

      resource.on.setup(() => {
        const s = Subscription.subscribe(channel.current);
        socket.set(s);

        return () => {
          return s.disconnect();
        };
      });

      return () => {
        return {
          socket: socket.current,
          description: `${username.current} @ ${channel.current}`,
        };
      };
    }).create({ owner: parent });

    let last = resource.current;
    expect(last.description).toBe("@tomdale @ emails");
    expect(last.socket).toBe(undefined);

    Resource.setup(resource);

    let next = resource.current;
    expect(next.description).toBe("@tomdale @ emails");
    expect(next.socket?.name).toBe("emails");
    last = next;

    username.set("@todale");

    next = resource.current;
    expect(next.description).toBe("@todale @ emails");
    expect(last.socket).toBe(next.socket);
    expect(last.socket?.name).toBe("emails");
    expect(last.socket?.isActive).toBe(true);
    last = next;

    channel.set("twitter");

    next = resource.current;
    expect(last.socket).not.toBe(next.socket);
    expect(last.socket?.isActive).toBe(false);
    expect(next.description).toBe("@todale @ twitter");
    expect(next.socket?.name).toBe("twitter");
    expect(next.socket?.isActive).toBe(true);
    last = next;

    LIFETIME.finalize(parent);

    next = resource.current;
    expect(next.socket?.name).toBe("twitter");
    expect(next.socket?.isActive).toBe(false);
  });
});
