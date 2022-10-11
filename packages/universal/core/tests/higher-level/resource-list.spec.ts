import { Resource, ResourceList } from "@starbeam/core";
import { Stack } from "@starbeam/debug";
import { reactive } from "@starbeam/js";
import { describe, expect, test } from "vitest";

interface Item {
  id: number;
  name: string;
  location: string;
}

class Subscription {
  #active = true;

  constructor(readonly name: string) {
    Object.defineProperty(this, "isActive", {
      enumerable: true,
      get: () => {
        return this.#active;
      },
    });
  }

  connect() {
    this.#active = true;
  }

  disconnect() {
    this.#active = false;
  }

  get isActive() {
    return this.#active;
  }
}

describe("ResourceList", () => {
  test("should update resources", () => {
    const list: Item[] = reactive.array([
      { id: 1, name: "Tom", location: "NYC" },
      { id: 2, name: "Chirag", location: "NYC" },
    ]);

    const resource = (item: Item) =>
      Resource((r) => {
        const subscription = new Subscription(item.name);

        r.on.setup(() => {
          subscription.connect();
          return () => {
            subscription.disconnect();
          };
        });

        return () => ({
          card: `${subscription.name} (${item.location})`,
          subscription: subscription,
        });
      }, `subscription for '${item.name}' (${item.id})`);

    const lifetime = {};

    const linkables = ResourceList(list, {
      key: (item) => item.id,
      resource,
    });

    const resources = linkables.create({ owner: lifetime });

    ResourceList.setup(resources, Stack.EMPTY);

    expect(resources.current).toEqual([
      { card: "Tom (NYC)", subscription: { name: "Tom", isActive: true } },
      {
        card: "Chirag (NYC)",
        subscription: { name: "Chirag", isActive: true },
      },
    ]);

    list.push({ id: 3, name: "John", location: "NYC" });

    let currentResources = resources.current;
    const tom = currentResources[0].subscription;
    const chirag = currentResources[1].subscription;
    const john = currentResources[2].subscription;

    expect(resources.current).toEqual([
      { card: "Tom (NYC)", subscription: { name: "Tom", isActive: true } },
      {
        card: "Chirag (NYC)",
        subscription: { name: "Chirag", isActive: true },
      },
      { card: "John (NYC)", subscription: { name: "John", isActive: true } },
    ]);

    list.pop();

    expect(list).toEqual([
      { id: 1, name: "Tom", location: "NYC" },
      { id: 2, name: "Chirag", location: "NYC" },
    ]);

    expect(resources.current).toEqual([
      { card: "Tom (NYC)", subscription: { name: "Tom", isActive: true } },
      {
        card: "Chirag (NYC)",
        subscription: { name: "Chirag", isActive: true },
      },
    ]);

    expect(john.isActive).toBe(false);

    list.reverse();

    expect(list).toEqual([
      { id: 2, name: "Chirag", location: "NYC" },
      { id: 1, name: "Tom", location: "NYC" },
    ]);

    currentResources = resources.current;

    expect(currentResources[0].subscription).toBe(chirag);
    expect(currentResources[1].subscription).toBe(tom);

    expect(resources.current).toEqual([
      {
        card: "Chirag (NYC)",
        subscription: { name: "Chirag", isActive: true },
      },
      { card: "Tom (NYC)", subscription: { name: "Tom", isActive: true } },
    ]);
  });
});
