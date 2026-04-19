import { reactive } from "@starbeam/collections";
import { CachedFormula } from "@starbeam/universal";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

import { Invalidation } from "./support.js";

describe("TrackedWeakMap", () => {
  const brie = { name: "brie" };
  const chevre = { name: "chevre" };
  const hotDogs = { name: "hot dogs" };
  const hamburgers = { name: "hamburgers" };
  const smashburgers = { name: "smashburgers" };

  test("basics", () => {
    const map = reactive.WeakMap();
    const delicious = CachedFormula(() => {
      return map.has(brie) || map.has(chevre);
    });

    expect(delicious.current).toEqual(false);

    map.set(hotDogs, "sandwich");
    expect(delicious.current).toEqual(false);

    map.set(brie, "cheese");
    expect(delicious.current).toEqual(true);

    map.set(chevre, "cheese");
    expect(delicious.current).toEqual(true);

    map.delete(brie);
    expect(delicious.current).toEqual(true);

    map.delete(chevre);
    expect(delicious.current).toEqual(false);
  });

  test("checking a non-existent item invalidates if the item is added", () => {
    const map = reactive.WeakMap();

    const delicious = Invalidation.trace(
      () => map.has(brie) || map.has(chevre),
    );

    expect(delicious.state).toEqual([false, "initialized"]);

    map.set(hotDogs, "sandwich");
    expect(delicious.state).toEqual([false, "stable"]);

    map.set(brie, "sandwich");
    expect(delicious.state).toEqual([true, "invalidated"]);

    map.set(brie, "brie");
    expect(delicious.state).toEqual([true, "stable"]);

    map.set(chevre, "sandwich");
    expect(delicious.state).toEqual([true, "stable"]);

    map.delete(brie);
    expect(delicious.state).toEqual([true, "invalidated"]);

    map.delete(chevre);
    expect(delicious.state).toEqual([false, "invalidated"]);

    map.delete(hotDogs);
    expect(delicious.state).toEqual([false, "stable"]);
  });

  test("updating a map's values invalidates consumers who checked those values or who fetched them", () => {
    const map = reactive.WeakMap();

    const hasBurgers = Invalidation.trace(() => {
      return map.has(hamburgers) || map.has(smashburgers);
    });
    const food = Invalidation.trace(() => map.get(hamburgers));

    expect(food.state).toEqual([undefined, "initialized"]);
    expect(hasBurgers.state).toEqual([false, "initialized"]);

    map.set(hamburgers, "burger");
    expect(food.state).toEqual(["burger", "invalidated"]);
    expect(hasBurgers.state).toEqual([true, "invalidated"]);

    map.set(hamburgers, "sandwich");
    expect(food.state).toEqual(["sandwich", "invalidated"]);
    // since hasBurgers only checks keys, changing the value of hamburgers
    // does not invalidate it
    expect(hasBurgers.state).toEqual([true, "stable"]);

    map.delete(hamburgers);
    expect(food.state).toEqual([undefined, "invalidated"]);
    expect(hasBurgers.state).toEqual([false, "invalidated"]);

    map.set(smashburgers, "burger");
    expect(food.state).toEqual([undefined, "stable"]);
    expect(hasBurgers.state).toEqual([true, "invalidated"]);

    map.set(hamburgers, "sandwich");
    expect(food.state).toEqual(["sandwich", "invalidated"]);
    expect(hasBurgers.state).toEqual([true, "invalidated"]);

    map.delete(smashburgers);
    // food.state is stable because it only accesses hamburgers
    expect(food.state).toEqual(["sandwich", "stable"]);
    // deleting smashburgers didn't invalidate hasBurgers, which checked
    // hamburgers first, and since it successfully found hamburgers, only
    // hamburgers was a dependency of hasBurgers. Since hamburgers didn't
    // change, hasBurgers is stable.
    expect(hasBurgers.state).toEqual([true, "stable"]);

    map.delete(hamburgers);
    expect(food.state).toEqual([undefined, "invalidated"]);
    expect(hasBurgers.state).toEqual([false, "invalidated"]);

    map.delete(smashburgers);
    expect(food.state).toEqual([undefined, "stable"]);
    expect(hasBurgers.state).toEqual([false, "stable"]);
  });

  describe("getOrInsert (TC39 upsert)", () => {
    test("returns the existing value when present and does not overwrite", () => {
      const map = reactive.WeakMap<object, string>();
      map.set(hamburgers, "burger");

      const existing = map.getOrInsert(hamburgers, "sandwich");

      expect(existing).toBe("burger");
      expect(map.get(hamburgers)).toBe("burger");
    });

    test("inserts the default when absent and returns it", () => {
      const map = reactive.WeakMap<object, string>();

      const inserted = map.getOrInsert(hamburgers, "burger");

      expect(inserted).toBe("burger");
      expect(map.get(hamburgers)).toBe("burger");
    });

    test("invalidates a prior has() when it inserts", () => {
      const map = reactive.WeakMap<object, string>();
      const hasHamburgers = Invalidation.trace(() => map.has(hamburgers));
      expect(hasHamburgers.state).toEqual([false, "initialized"]);

      map.getOrInsert(hamburgers, "burger");

      expect(hasHamburgers.state).toEqual([true, "invalidated"]);
    });
  });

  describe("getOrInsertComputed (TC39 upsert)", () => {
    test("returns the existing value without invoking the callback", () => {
      const map = reactive.WeakMap<object, string>();
      map.set(hamburgers, "burger");
      let called = 0;

      const existing = map.getOrInsertComputed(hamburgers, () => {
        called++;
        return "sandwich";
      });

      expect(existing).toBe("burger");
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- call count
      expect(called).toBe(0);
    });

    test("invokes the callback with the key and inserts when absent", () => {
      const map = reactive.WeakMap<object, string>();
      const seenKeys: object[] = [];

      const inserted = map.getOrInsertComputed(hamburgers, (key) => {
        seenKeys.push(key);
        return "burger";
      });

      expect(inserted).toBe("burger");
      expect(seenKeys).toEqual([hamburgers]);
      expect(map.get(hamburgers)).toBe("burger");
    });
  });
});
