import { DisplayStruct } from "@starbeam/debug";
import { reactive } from "@starbeam/js";
import { CachedFormula, Cell, type FormulaFn } from "@starbeam/reactive";
import {
  LIFETIME,
  Resource3 as Resource,
  type ResourceBlueprint3 as ResourceBlueprint,
  ResourceList3 as ResourceList,
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

describe("v3::ResourceList", () => {
  test("smoke test", () => {
    const list: Item[] = reactive.array([
      { id: 1, name: "Tom", location: "NYC" },
      { id: 2, name: "Chirag", location: "NYC" },
    ]);

    const map = (
      item: Item
    ): ResourceBlueprint<{ active: boolean; desc: string }> => {
      const active = Cell(true);
      return Resource(({ on }) => {
        on.cleanup(() => {
          active.set(false);
        });

        return {
          get active() {
            return active.current;
          },
          get desc() {
            return `${item.name} (${item.location})`;
          },
        };
      });
    };

    const lifetime = { lifetime: "root" };
    const mapped = ResourceList(list, {
      key: (item) => item.id,
      map,
    }).create({ lifetime });

    expect(mapped.current.map((r) => r.current)).toEqual([
      { active: true, desc: "Tom (NYC)" },
      { active: true, desc: "Chirag (NYC)" },
    ]);

    list.push({ id: 3, name: "John", location: "LA" });

    expect(mapped.current.map((r) => r.current)).toEqual([
      { active: true, desc: "Tom (NYC)" },
      { active: true, desc: "Chirag (NYC)" },
      { active: true, desc: "John (LA)" },
    ]);

    LIFETIME.finalize(lifetime);

    expect(mapped.current.map((r) => r.current)).toEqual([
      { active: false, desc: "Tom (NYC)" },
      { active: false, desc: "Chirag (NYC)" },
      { active: false, desc: "John (LA)" },
    ]);
  });

  test("should update resources", () => {
    const list: Item[] = reactive.array([
      { id: 1, name: "Tom", location: "NYC" },
      { id: 2, name: "Chirag", location: "NYC" },
    ]);

    const map = (
      item: Item
    ): ResourceBlueprint<
      FormulaFn<{
        card: string;
        subscription: Subscription;
      }>
    > =>
      Resource(({ on }) => {
        const subscription = new Subscription(item.name);
        subscription.connect();

        on.cleanup(() => {
          console.trace({ disconnecting: item.id });
          subscription.disconnect();
        });

        return CachedFormula(() => ({
          card: `${subscription.name} (${item.location})`,
          subscription: subscription,
        }));
      }, `subscription for '${item.name}' (${item.id})`);

    const lifetime = { lifetime: "root" };

    const linkables = ResourceList(list, {
      key: (item) => item.id,
      map,
    });

    const resources = linkables.create({ lifetime });

    function current(): { card: string; subscription: Subscription }[] {
      return resources.current.map((r) => r.current.current);
    }

    expect(current()).toEqual([
      { card: "Tom (NYC)", subscription: { name: "Tom", isActive: true } },
      {
        card: "Chirag (NYC)",
        subscription: { name: "Chirag", isActive: true },
      },
    ]);

    list.push({ id: 3, name: "John", location: "NYC" });

    let currentResources = current();

    const tom = currentResources[0]?.subscription;
    const chirag = currentResources[1]?.subscription;
    const john = currentResources[2]?.subscription;

    expect(currentResources).toEqual([
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

    expect(current()).toEqual([
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

    currentResources = resources.current.map((r) => r.current.current);

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
