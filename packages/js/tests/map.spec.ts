import { reactive } from "@starbeam/js";
import { describe, expect, test } from "vitest";

import { Invalidation } from "./support.js";

describe("TrackedMap", () => {
  test("adding and deleting items updates the size", () => {
    const map = reactive.Map();
    expect(map.size).toBe(0);

    const size = Invalidation.trace(() => `The map has ${map.size} items`);

    expect(size.state).toEqual([`The map has 0 items`, "initialized"]);

    map.set("hot dogs", "sandwich");
    expect(size.state).toEqual([`The map has 1 items`, "invalidated"]);

    map.set("hamburgers", "sandwich");
    expect(size.state).toEqual([`The map has 2 items`, "invalidated"]);

    map.set("hamburgers", "burger");
    expect(size.state).toEqual([`The map has 2 items`, "stable"]);

    map.delete("hamburgers");
    expect(size.state).toEqual([`The map has 1 items`, "invalidated"]);

    map.delete("hot dogs");
    expect(size.state).toEqual([`The map has 0 items`, "invalidated"]);
  });

  test("checking a non-existent item invalidates if the item is added", () => {
    const map = reactive.Map();

    const delicious = Invalidation.trace(
      () => map.has("brie") || map.has("chevre")
    );

    expect(delicious.state).toEqual([false, "initialized"]);

    map.set("hot dogs", "sandwich");
    expect(delicious.state).toEqual([false, "stable"]);

    map.set("brie", "sandwich");
    expect(delicious.state).toEqual([true, "invalidated"]);

    map.set("brie", "brie");
    expect(delicious.state).toEqual([true, "stable"]);

    map.set("chevre", "sandwich");
    expect(delicious.state).toEqual([true, "stable"]);

    map.delete("brie");
    expect(delicious.state).toEqual([true, "invalidated"]);

    map.delete("chevre");
    expect(delicious.state).toEqual([false, "invalidated"]);

    map.delete("hot dogs");
    expect(delicious.state).toEqual([false, "stable"]);
  });

  test("iterating the map invalidates if the items are changed", () => {
    const map = reactive.Map();

    const delicious = Invalidation.trace(() => [...map.keys()]);

    const foods = Invalidation.trace(() => {
      return [...map].map(([k]) => k).join(", ") || "<nothing>";
    });

    const foodsByKeys = Invalidation.trace(() => {
      return [...map.keys()].join(", ") || "<nothing>";
    });

    const foodsByEntries = Invalidation.trace(() => {
      return [...map.entries()].map(([k]) => k).join(", ") || "<nothing>";
    });

    const foodTypes = Invalidation.trace(() => {
      return [...new Set([...map.values()])];
    });

    function assert(
      formatted: string,
      list: string[],
      types: string[],
      state: "initialized" | "stable" | "invalidated"
    ) {
      expect(foods.state).toEqual([formatted, state]);
      expect(foodsByKeys.state).toEqual([
        list.join(", ") || "<nothing>",
        state,
      ]);
      expect(foodsByEntries.state).toEqual([
        list.join(", ") || "<nothing>",
        state,
      ]);
      expect(delicious.state).toEqual([list, state]);
      expect(foodTypes.state).toEqual([types, state]);
    }

    assert("<nothing>", [], [], "initialized");

    map.set("hot dogs", "sandwich");
    assert("hot dogs", ["hot dogs"], ["sandwich"], "invalidated");

    // // maps are ordered
    map.set("brie", "cheese");
    assert(
      "hot dogs, brie",
      ["hot dogs", "brie"],
      ["sandwich", "cheese"],
      "invalidated"
    );

    map.set("chevre", "cheese");
    assert(
      "hot dogs, brie, chevre",
      ["hot dogs", "brie", "chevre"],
      ["sandwich", "cheese"],
      "invalidated"
    );

    map.set("hamburgers", "burger");
    assert(
      "hot dogs, brie, chevre, hamburgers",
      ["hot dogs", "brie", "chevre", "hamburgers"],
      ["sandwich", "cheese", "burger"],
      "invalidated"
    );

    map.set("hamburgers", "burger");
    assert(
      "hot dogs, brie, chevre, hamburgers",
      ["hot dogs", "brie", "chevre", "hamburgers"],
      ["sandwich", "cheese", "burger"],
      "stable"
    );

    // update the value of hamburgers
    map.set("hamburgers", "sandwich");
    expect(delicious.state).toEqual([
      ["hot dogs", "brie", "chevre", "hamburgers"],
      "stable",
    ]);
    expect(foods.state).toEqual([
      "hot dogs, brie, chevre, hamburgers",
      "invalidated",
    ]);
    // since foodsByKeys only consumes keys, changing the value of hamburgers
    // does not invalidate it
    expect(foodsByKeys.state).toEqual([
      "hot dogs, brie, chevre, hamburgers",
      "stable",
    ]);
    // because foodsByEntries iterated entries, it consumed the change to the
    // hamburgers food type, which invalidates it.
    expect(foodsByEntries.state).toEqual([
      "hot dogs, brie, chevre, hamburgers",
      "invalidated",
    ]);
    expect(foodTypes.state).toEqual([["sandwich", "cheese"], "invalidated"]);

    map.delete("hamburgers");
    assert(
      "hot dogs, brie, chevre",
      ["hot dogs", "brie", "chevre"],
      ["sandwich", "cheese"],
      "invalidated"
    );

    map.delete("hot dogs");
    assert("brie, chevre", ["brie", "chevre"], ["cheese"], "invalidated");

    map.delete("brie");
    assert("chevre", ["chevre"], ["cheese"], "invalidated");

    map.delete("brie");
    assert("chevre", ["chevre"], ["cheese"], "stable");

    map.set("chevre", "goat cheese");
    expect(delicious.state).toEqual([["chevre"], "stable"]);
    expect(foods.state).toEqual(["chevre", "invalidated"]);
    expect(foodsByKeys.state).toEqual(["chevre", "stable"]);
    expect(foodsByEntries.state).toEqual(["chevre", "invalidated"]);
    expect(foodTypes.state).toEqual([["goat cheese"], "invalidated"]);

    map.delete("chevre");
    assert("<nothing>", [], [], "invalidated");
  });

  test("updating a map's values invalidates consumers who checked those values or who fetched them", () => {
    const map = reactive.Map();

    const hasBurgers = Invalidation.trace(() => {
      return map.has("hamburgers") || map.has("smashburgers");
    });
    const food = Invalidation.trace(() => map.get("hamburgers"));
    const foodTypes = Invalidation.trace(() => {
      return [...new Set([...map.values()])];
    });

    expect(food.state).toEqual([undefined, "initialized"]);
    expect(foodTypes.state).toEqual([[], "initialized"]);
    expect(hasBurgers.state).toEqual([false, "initialized"]);

    map.set("hamburgers", "burger");
    expect(food.state).toEqual(["burger", "invalidated"]);
    expect(foodTypes.state).toEqual([["burger"], "invalidated"]);
    expect(hasBurgers.state).toEqual([true, "invalidated"]);

    map.set("hamburgers", "sandwich");
    expect(food.state).toEqual(["sandwich", "invalidated"]);
    expect(foodTypes.state).toEqual([["sandwich"], "invalidated"]);
    // since hasBurgers only checks keys, changing the value of hamburgers
    // does not invalidate it
    expect(hasBurgers.state).toEqual([true, "stable"]);

    map.delete("hamburgers");
    expect(food.state).toEqual([undefined, "invalidated"]);
    expect(foodTypes.state).toEqual([[], "invalidated"]);
    expect(hasBurgers.state).toEqual([false, "invalidated"]);

    map.set("smashburgers", "burger");
    expect(food.state).toEqual([undefined, "stable"]);
    expect(foodTypes.state).toEqual([["burger"], "invalidated"]);
    expect(hasBurgers.state).toEqual([true, "invalidated"]);

    map.set("hamburgers", "sandwich");
    expect(food.state).toEqual(["sandwich", "invalidated"]);
    expect(foodTypes.state).toEqual([["burger", "sandwich"], "invalidated"]);
    expect(hasBurgers.state).toEqual([true, "invalidated"]);

    map.delete("smashburgers");
    // food.state is stable because it only accesses hamburgers
    expect(food.state).toEqual(["sandwich", "stable"]);
    // deleting smashburgers invalidates foodTypes, which enumerated values
    expect(foodTypes.state).toEqual([["sandwich"], "invalidated"]);
    // deleting smashburgers didn't invalidate hasBurgers, which checked hamburgers
    // first, and since it successfully found hamburgers, only hamburgers was a dependency
    // of hasBurgers. Since hamburgers didn't change, hasBurgers is stable.
    expect(hasBurgers.state).toEqual([true, "stable"]);

    map.delete("hamburgers");
    expect(food.state).toEqual([undefined, "invalidated"]);
    expect(foodTypes.state).toEqual([[], "invalidated"]);
    expect(hasBurgers.state).toEqual([false, "invalidated"]);

    map.delete("smashburgers");
    expect(food.state).toEqual([undefined, "stable"]);
    expect(foodTypes.state).toEqual([[], "stable"]);
    expect(hasBurgers.state).toEqual([false, "stable"]);
  });
});
