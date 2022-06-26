import { reactive } from "@starbeam/js";
import { describe, expect, test } from "vitest";

import { Invalidation } from "./support.js";

describe("TrackedWeakSet", () => {
  const brie = { name: "brie" };
  const chevre = { name: "chevre" };
  const hotDogs = { name: "hot dogs" };

  test("checking a non-existent item invalidates if the item is added", () => {
    const set = reactive.WeakSet();

    const delicious = Invalidation.trace(
      () => set.has(brie) || set.has(chevre)
    );

    expect(delicious.state).toEqual([false, "initialized"]);

    set.add(hotDogs);
    expect(delicious.state).toEqual([false, "stable"]);

    set.add(brie);
    expect(delicious.state).toEqual([true, "invalidated"]);

    set.add(brie);
    expect(delicious.state).toEqual([true, "stable"]);

    set.add(chevre);
    expect(delicious.state).toEqual([true, "stable"]);

    set.delete(brie);
    expect(delicious.state).toEqual([true, "invalidated"]);

    set.delete(chevre);
    expect(delicious.state).toEqual([false, "invalidated"]);

    set.delete(hotDogs);
    expect(delicious.state).toEqual([false, "stable"]);
  });

  test("checking an existing item invalidates if the item is deleted", () => {
    const set = reactive.WeakSet();

    set.add(brie);
    set.add(chevre);

    const delicious = Invalidation.trace(
      () => set.has(brie) || set.has(chevre)
    );

    expect(delicious.state).toEqual([true, "initialized"]);

    set.delete(brie);
    expect(delicious.state).toEqual([true, "invalidated"]);

    set.delete(chevre);
    expect(delicious.state).toEqual([false, "invalidated"]);
  });
});
