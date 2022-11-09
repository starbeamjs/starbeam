import { DisplayStruct } from "@starbeam/debug";
import { reactive } from "@starbeam/js";
import {
  type ResourceBlueprint,
  Formula,
  Resource,
  ResourceList,
} from "@starbeam/universal";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

interface Item {
  id: number;
  name: string;
  location: string;
}

class Subscription {
  #active = true;
  declare readonly isActive: boolean;

  constructor(readonly name: string) {
    Object.defineProperty(this, "isActive", {
      enumerable: true,
      get: () => {
        return this.#active;
      },
    });
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayStruct("Subscription", {
      name: this.name,
      isActive: this.isActive,
    });
  }

  connect(): void {
    this.#active = true;
  }

  disconnect(): void {
    this.#active = false;
  }
}

describe("ResourceList", () => {
  test("should update resources", () => {
    const list: Item[] = reactive.array([
      { id: 1, name: "Tom", location: "NYC" },
      { id: 2, name: "Chirag", location: "NYC" },
    ]);

    const map = (
      item: Item
    ): ResourceBlueprint<{
      card: string;
      subscription: Subscription;
    }> =>
      Resource(({ on }) => {
        const subscription = new Subscription(item.name);
        subscription.connect();

        on.cleanup(() => {
          subscription.disconnect();
        });

        return Formula(() => ({
          card: `${subscription.name} (${item.location})`,
          subscription: subscription,
        }));
      }, `subscription for '${item.name}' (${item.id})`);

    const lifetime = {};

    const linkables = ResourceList(list, {
      key: (item) => item.id,
      map,
    });

    const resources = linkables.create({ owner: lifetime });

    expect(resources.current.map((r) => r.current)).toEqual([
      { card: "Tom (NYC)", subscription: { name: "Tom", isActive: true } },
      {
        card: "Chirag (NYC)",
        subscription: { name: "Chirag", isActive: true },
      },
    ]);

    list.push({ id: 3, name: "John", location: "NYC" });

    let currentResources = resources.current.map((r) => r.current);

    const tom = currentResources[0]?.subscription;
    const chirag = currentResources[1]?.subscription;
    const john = currentResources[2]?.subscription;

    expect(resources.current.map((r) => r.current)).toEqual([
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

    expect(resources.current.map((r) => r.current)).toEqual([
      { card: "Tom (NYC)", subscription: { name: "Tom", isActive: true } },
      {
        card: "Chirag (NYC)",
        subscription: { name: "Chirag", isActive: true },
      },
    ]);

    expect(john?.isActive).toBe(false);

    list.reverse();

    expect(list).toEqual([
      { id: 2, name: "Chirag", location: "NYC" },
      { id: 1, name: "Tom", location: "NYC" },
    ]);

    currentResources = resources.current.map((r) => r.current);

    expect(currentResources[0]?.subscription).toBe(chirag);
    expect(currentResources[1]?.subscription).toBe(tom);

    expect(currentResources).toEqual([
      {
        card: "Chirag (NYC)",
        subscription: { name: "Chirag", isActive: true },
      },
      { card: "Tom (NYC)", subscription: { name: "Tom", isActive: true } },
    ]);
  });
});
