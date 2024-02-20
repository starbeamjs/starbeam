/* eslint-disable @typescript-eslint/no-magic-numbers */
import { reactive } from "@starbeam/collections";
import { CachedFormula, Cell } from "@starbeam/reactive";
import type { ResourceBlueprint } from "@starbeam/resource";
import { Resource, ResourceList } from "@starbeam/resource";
import { pushingScope } from "@starbeam/runtime";
import { finalize } from "@starbeam/shared";
import { describe, expect, test } from "@starbeam-workspace/test-utils";
import { DisplayStruct } from "inspect-utils";

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
  test("smoke test", () => {
    const list: Item[] = reactive.array([
      { id: 1, name: "Tom", location: "NYC" },
      { id: 2, name: "Chirag", location: "NYC" },
    ]);

    const map = (
      item: Item,
    ): ResourceBlueprint<{ active: boolean; desc: string }> => {
      const active = Cell(false);
      return Resource(({ on }) => {
        on.finalize(() => {
          active.set(false);
        });

        on.sync(() => {
          active.set(true);
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

    const Mapped = ResourceList(list, {
      key: (item) => item.id,
      map,
    });

    const [lifetime, { sync, value: mapped }] = pushingScope(() =>
      Mapped.setup(),
    );

    sync();

    expect(mapped.current).toEqual([
      { active: true, desc: "Tom (NYC)" },
      { active: true, desc: "Chirag (NYC)" },
    ]);

    list.push({ id: 3, name: "John", location: "LA" });

    sync();

    expect(mapped.current).toEqual([
      { active: true, desc: "Tom (NYC)" },
      { active: true, desc: "Chirag (NYC)" },
      { active: true, desc: "John (LA)" },
    ]);

    finalize(lifetime);

    expect(mapped.current).toEqual([
      { active: false, desc: "Tom (NYC)" },
      { active: false, desc: "Chirag (NYC)" },
      { active: false, desc: "John (LA)" },
    ]);
  });

  test("resources can be used but not set up", () => {
    const list: Item[] = reactive.array([
      { id: 1, name: "Tom", location: "NYC" },
      { id: 2, name: "Chirag", location: "NYC" },
    ]);

    const map = (
      item: Item,
    ): ResourceBlueprint<{ active: boolean; desc: string }> => {
      const active = Cell(false);
      return Resource(({ on }) => {
        on.finalize(() => {
          active.set(false);
        });

        on.sync(() => {
          active.set(true);
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

    const Mapped = ResourceList(list, {
      key: (item) => item.id,
      map,
    });

    const [lifetime, { sync, value: mapped }] = pushingScope(() =>
      Mapped.setup(),
    );

    expect(mapped.current).toEqual([
      { active: false, desc: "Tom (NYC)" },
      { active: false, desc: "Chirag (NYC)" },
    ]);

    list.push({ id: 3, name: "John", location: "LA" });

    sync();

    expect(mapped.current).toEqual([
      { active: true, desc: "Tom (NYC)" },
      { active: true, desc: "Chirag (NYC)" },
      { active: true, desc: "John (LA)" },
    ]);

    finalize(lifetime);

    expect(mapped.current).toEqual([
      { active: false, desc: "Tom (NYC)" },
      { active: false, desc: "Chirag (NYC)" },
      { active: false, desc: "John (LA)" },
    ]);
  });
  test("should update resources", () => {
    const items: Item[] = reactive.array([
      { id: 1, name: "Tom", location: "NYC" },
      { id: 2, name: "Chirag", location: "NYC" },
    ]);

    const map = (item: Item) =>
      Resource(({ on }) => {
        const subscription = new Subscription(item.name);
        subscription.connect();

        on.finalize(() => {
          subscription.disconnect();
        });

        return CachedFormula(() => ({
          card: `${subscription.name} (${item.location})`,
          subscription: subscription,
        }));
      }, `subscription for '${item.name}' (${item.id})`);

    const List = ResourceList(items, {
      key: (item) => item.id,
      map,
    });

    const [, { sync, value: list }] = pushingScope(() => List.setup());

    function current(): { card: string; subscription: Subscription }[] {
      sync();
      return list.current.map((r) => r.current);
    }

    expect(current()).toEqual([
      { card: "Tom (NYC)", subscription: { name: "Tom", isActive: true } },
      {
        card: "Chirag (NYC)",
        subscription: { name: "Chirag", isActive: true },
      },
    ]);

    items.push({ id: 3, name: "John", location: "NYC" });

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

    items.pop();

    expect(items).toEqual([
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

    items.reverse();

    sync();

    expect(items).toEqual([
      { id: 2, name: "Chirag", location: "NYC" },
      { id: 1, name: "Tom", location: "NYC" },
    ]);

    currentResources = list.current.map((r) => r.current);

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
