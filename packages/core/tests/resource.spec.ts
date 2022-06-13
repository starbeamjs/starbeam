import { Cell, Resource } from "@starbeam/core";
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
      const socket = Subscription.subscribe(channel.current);

      resource.on.cleanup(() => socket.disconnect());

      return () => ({
        socket,
        description: `${username.current} @ ${channel.current}`,
      });
    }).create({ owner: parent });

    let last = resource.current;
    expect(last.description).toBe("@tomdale @ emails");
    expect(last.socket.name).toBe("emails");

    username.set("@todale");

    let next = resource.current;

    expect(next.description).toBe("@todale @ emails");
    expect(last.socket).toBe(next.socket);
    expect(last.socket).toMatchObject({
      name: "emails",
      isActive: true,
    });

    last = next;

    channel.set("twitter");

    next = resource.current;

    expect(next.description).toBe("@todale @ twitter");
    expect(last.socket).not.toBe(next.socket);

    expect(last.socket).toMatchObject({
      name: "emails",
      isActive: false,
    });

    expect(next.socket).toMatchObject({
      name: "twitter",
      isActive: true,
    });

    last = next;

    LIFETIME.finalize(parent);

    next = resource.current;

    expect(next.socket).toMatchObject({
      name: "twitter",
      isActive: false,
    });
  });
});
