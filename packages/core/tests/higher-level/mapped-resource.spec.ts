import { Resource, ResourceFn } from "@starbeam/core";
import { LIFETIME } from "@starbeam/timeline";
import { describe, expect, test } from "vitest";

class Subscription {
  static #nextId = 0;

  static create(person: { name: string; location: string }) {
    return new Subscription(Subscription.#nextId++, person);
  }

  #id: number;
  #person: { name: string; location: string };
  #active = true;

  constructor(id: number, person: { name: string; location: string }) {
    this.#id = id;
    this.#person = person;
  }

  get isActive() {
    return this.#active;
  }

  get description() {
    return `${this.#person.name} is in ${this.#person.location} (${this.#id}, ${
      this.#active ? "active" : "inactive"
    })`;
  }

  connect() {
    this.#active = true;
  }

  disconnect() {
    this.#active = false;
  }
}

const PersonSubscription = (person: { name: string; location: string }) =>
  Resource((r) => {
    const subscription = Subscription.create(person);

    r.on.setup(() => {
      subscription.connect();
      return () => subscription.disconnect();
    });

    return () => subscription;
  }, "PersonSubscription");

describe.skip("MappedResource", () => {
  test("should map a cell to a resource", () => {
    const lifetime = {};

    const subscribe = ResourceFn({
      fn: PersonSubscription,
      equals: (a, b) => a.name === b.name && a.location === b.location,
    }).create({ owner: lifetime });

    let last: Subscription = subscribe({ name: "Tom", location: "NYC" });
    expect(last.description).toBe("Tom is in NYC (0, active)");

    let next = subscribe({ name: "Tom", location: "NYC" });
    expect(next).toBe(last);
    last = next;
    expect(last.description).toBe("Tom is in NYC (0, active)");

    next = subscribe({ name: "Tom", location: "SF" });
    expect(next).not.toBe(last);
    expect(last.description).toBe("Tom is in NYC (0, inactive)");
    expect(next.description).toBe("Tom is in SF (1, active)");
    last = next;

    LIFETIME.finalize(lifetime);

    expect(last.description).toBe("Tom is in SF (1, inactive)");
  });
});
