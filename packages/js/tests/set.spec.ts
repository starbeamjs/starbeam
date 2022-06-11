import { Formula } from "@starbeam/core";
import reactive from "@starbeam/js";
import { describe, expect, test } from "vitest";

import { Invalidation } from "./support.js";

describe("TrackedSet", () => {
  test("adding and deleting items updates the size", () => {
    const set = reactive(Set);
    expect(set.size).toBe(0);

    const size = Formula(() => `The set has ${set.size} items`);

    expect(size.current).toBe("The set has 0 items");

    debugger;
    set.add("hot dogs");
    expect(size.current).toBe("The set has 1 items");

    set.add("hamburgers");
    expect(size.current).toBe("The set has 2 items");

    set.delete("hamburgers");
    expect(size.current).toBe("The set has 1 items");

    set.delete("hot dogs");
    expect(size.current).toBe("The set has 0 items");
  });

  test("checking a non-existent item invalidates if the item is added", () => {
    const set = reactive(Set);

    const delicious = Invalidation.trace(
      () => set.has("brie") || set.has("chevre")
    );

    expect(delicious.state).toEqual([false, "initialized"]);

    set.add("hot dogs");
    expect(delicious.state).toEqual([false, "stable"]);

    set.add("brie");
    expect(delicious.state).toEqual([true, "invalidated"]);

    set.add("brie");
    expect(delicious.state).toEqual([true, "stable"]);

    set.add("chevre");
    expect(delicious.state).toEqual([true, "stable"]);

    set.delete("brie");
    expect(delicious.state).toEqual([true, "invalidated"]);

    set.delete("chevre");
    expect(delicious.state).toEqual([false, "invalidated"]);

    set.delete("hot dogs");
    expect(delicious.state).toEqual([false, "stable"]);
  });

  test("iterating the set invalidates if the items are changed", () => {
    const set = reactive<string>(Set);

    const foods = Invalidation.trace(() => {
      return [...set].join(", ") || "<nothing>";
    });

    const foodsByKeys = Invalidation.trace(() => {
      return [...set.keys()].join(", ") || "<nothing>";
    });

    const foodsByValues = Invalidation.trace(() => {
      return [...set.values()].join(", ") || "<nothing>";
    });

    const foodsByForLoop = Invalidation.trace(() => {
      let result = "";
      for (const food of set) {
        result += food + ", ";
      }

      result = result.slice(0, -2);
      return result || "<nothing>";
    });

    const foodsByEntries = Invalidation.trace(() => {
      return [...set.entries()].map(([key]) => key).join(", ") || "<nothing>";
    });

    const foodsByForEach = Invalidation.trace(() => {
      let result = "";

      set.forEach((food) => {
        result += food + ", ";
      });

      result = result.slice(0, -2);

      return result || "<nothing>";
    });

    function assert(
      value: string,
      state: "initialized" | "stable" | "invalidated"
    ) {
      expect(foods.state).toEqual([value, state]);
      expect(foodsByKeys.state).toEqual([value, state]);
      expect(foodsByValues.state).toEqual([value, state]);
      expect(foodsByForLoop.state).toEqual([value, state]);
      expect(foodsByEntries.state).toEqual([value, state]);
      expect(foodsByForEach.state).toEqual([value, state]);
    }

    assert("<nothing>", "initialized");
    set.add("hot dogs");
    assert("hot dogs", "invalidated");

    set.add("hamburgers");
    assert("hot dogs, hamburgers", "invalidated");

    set.add("hamburgers");
    assert("hot dogs, hamburgers", "stable");

    set.delete("hamburgers");
    assert("hot dogs", "invalidated");

    set.delete("hamburgers");
    assert("hot dogs", "stable");

    set.delete("hot dogs");
    assert("<nothing>", "invalidated");

    set.add("coke");
    assert("coke", "invalidated");

    set.clear();

    assert("<nothing>", "invalidated");
  });
});
