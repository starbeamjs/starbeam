import { Cell, Resource } from "@starbeam/core";
import { Stack } from "@starbeam/debug";
import { LIFETIME } from "@starbeam/timeline";
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

describe("resources", () => {
  test("a resource is a formula with lifetime", () => {
    const channel = Cell("emails");
    const username = Cell("@tomdale");

    const parent = {};

    const resource = Resource((resource) => {
      const socket = Cell(undefined as Subscription | undefined);

      resource.on.setup(() => {
        console.log("Running setup");
        const s = Subscription.subscribe(channel.current);
        socket.set(s);

        return () => s.disconnect();
      });

      return () => ({
        socket: socket.current,
        description: `${username.current} @ ${channel.current}`,
      });
    }).create({ owner: parent });

    let last = resource.current;
    expect(last.description).toBe("@tomdale @ emails");
    expect(last.socket).toBe(undefined);

    Resource.setup(resource, Stack.EMPTY);

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
