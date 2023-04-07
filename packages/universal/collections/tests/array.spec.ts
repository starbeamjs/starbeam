import { reactive } from "@starbeam/collections";
import { Formula } from "@starbeam/universal";
import { describe, expect, test } from "vitest";

import { Invalidation } from "./support.js";

// import { Invalidation } from "./support.js";

describe("TrackedArray", () => {
  test("adding and deleting items updates the size", () => {
    const array = reactive.array<string>([]);
    expect(array.length).toBe(0);

    const size = Formula(() => `The array has ${array.length} items`);
    const isEmpty = Formula(() => array.length === 0);

    expect(size.current).toBe("The array has 0 items");
    expect(isEmpty.current).toBe(true);

    array.push("hot dogs");
    expect(size.current).toBe("The array has 1 items");
    expect(isEmpty.current).toBe(false);

    array.push("hamburgers");
    expect(size.current).toBe("The array has 2 items");
    expect(isEmpty.current).toBe(false);

    array.pop();
    expect(size.current).toBe("The array has 1 items");
    expect(isEmpty.current).toBe(false);

    array.shift();
    expect(size.current).toBe("The array has 0 items");
    expect(isEmpty.current).toBe(true);
  });

  test("iterating the array invalidates if the items are changed", () => {
    const array = reactive.array<string>([]);

    const delicious = Invalidation.trace(
      () => array.includes("brie") || array.includes("chevre")
    );

    expect(delicious.state).toEqual([false, "initialized"]);

    array.push("hot dogs");
    expect(array).toEqual(["hot dogs"]);
    expect(delicious.state).toEqual([false, "invalidated"]);

    array.push("brie");
    expect(array).toEqual(["hot dogs", "brie"]);
    expect(delicious.state).toEqual([true, "invalidated"]);

    // array don't have uniqueness, so adding the same item twice is still invalidated
    array.push("brie");
    expect(array).toEqual(["hot dogs", "brie", "brie"]);
    expect(delicious.state).toEqual([true, "invalidated"]);

    array.push("chevre");
    expect(array).toEqual(["hot dogs", "brie", "brie", "chevre"]);
    expect(delicious.state).toEqual([true, "invalidated"]);

    array.splice(1, 1);
    expect(array).toEqual(["hot dogs", "brie", "chevre"]);
    expect(delicious.state).toEqual([true, "invalidated"]);

    array.splice(1, 1);
    expect(array).toEqual(["hot dogs", "chevre"]);
    expect(delicious.state).toEqual([true, "invalidated"]);

    array.pop();
    expect(array).toEqual(["hot dogs"]);
    expect(delicious.state).toEqual([false, "invalidated"]);

    array.shift();
    expect(array).toEqual([]);
    expect(delicious.state).toEqual([false, "invalidated"]);

    array.pop();
    expect(array).toEqual([]);
    expect(delicious.state).toEqual([false, "stable"]);
  });

  test("setting an item to the same value doesn't invalidate the index", () => {
    const array = reactive.array<string>(["hot dogs"]);

    const delicious = Invalidation.trace(
      () => array.includes("brie") || array.includes("chevre")
    );

    expect(delicious.state).toEqual([false, "initialized"]);

    array[0] = "hot dogs";
    expect(array).toEqual(["hot dogs"]);
    expect(delicious.state).toEqual([false, "stable"]);

    array[0] = "brie";
    expect(array).toEqual(["brie"]);
    expect(delicious.state).toEqual([true, "invalidated"]);

    array[0] = "brie";
    expect(array).toEqual(["brie"]);
    expect(delicious.state).toEqual([true, "stable"]);

    array[0] = "chevre";
    expect(array).toEqual(["chevre"]);
    expect(delicious.state).toEqual([true, "invalidated"]);

    array[0] = "chevre";
    expect(array).toEqual(["chevre"]);
    expect(delicious.state).toEqual([true, "stable"]);
  });

  test("truncating an array", () => {
    const array = reactive.array<string>(["hot dogs", "brie", "chevre"]);

    const delicious = Invalidation.trace(
      () => array.includes("brie") || array.includes("chevre")
    );

    expect(delicious.state).toEqual([true, "initialized"]);

    array.length = 1;
    expect(array).toEqual(["hot dogs"]);
    expect(delicious.state).toEqual([false, "invalidated"]);

    array.length = 0;
    expect(array).toEqual([]);
    expect(delicious.state).toEqual([false, "invalidated"]);
  });
});
