import { Formula } from "@starbeam/core";
import { reactive } from "@starbeam/js";
import { describe, expect, test } from "vitest";

import { Invalidation } from "./support.js";

// import { Invalidation } from "./support.js";

describe("TrackedObject", () => {
  test("adding and deleting items updates the size", () => {
    const object = reactive.object<Record<string, string>>({});

    const size = Formula(() => Object.keys(object).length);
    const described = Formula(() => `The object has ${size.current} items`);
    const isEmpty = Formula(() => size.current === 0);

    expect(size.current).toBe(0);
    expect(described.current).toBe("The object has 0 items");
    expect(isEmpty.current).toBe(true);

    object["hot dogs"] = "hot dogs";
    expect(size.current).toBe(1);
    expect(described.current).toBe("The object has 1 items");
    expect(isEmpty.current).toBe(false);

    object["hamburgers"] = "hamburgers";
    expect(size.current).toBe(2);
    expect(described.current).toBe("The object has 2 items");
    expect(isEmpty.current).toBe(false);

    delete object["hamburgers"];
    expect(size.current).toBe(1);
    expect(described.current).toBe("The object has 1 items");
    expect(isEmpty.current).toBe(false);

    delete object["hot dogs"];
    expect(size.current).toBe(0);
    expect(described.current).toBe("The object has 0 items");
    expect(isEmpty.current).toBe(true);
  });

  test("iterating the object invalidates if the items are changed", () => {
    const object = reactive.object<Record<string, string>>({});

    const delicious = Invalidation.trace(
      () => "brie" in object || "chevre" in object
    );

    expect(delicious.state).toEqual([false, "initialized"]);

    object["hot dogs"] = "hot dogs";
    expect(object).toEqual({ "hot dogs": "hot dogs" });
    expect(delicious.state).toEqual([false, "stable"]);

    object["brie"] = "brie";
    expect(object).toEqual({ "hot dogs": "hot dogs", brie: "brie" });
    expect(delicious.state).toEqual([true, "invalidated"]);

    // object adding the same item twice doesn't invalidate
    object["brie"] = "brie";
    expect(object).toEqual({
      "hot dogs": "hot dogs",
      brie: "brie",
    });
    expect(delicious.state).toEqual([true, "stable"]);

    object["chevre"] = "chevre";
    expect(object).toEqual({
      "hot dogs": "hot dogs",
      brie: "brie",
      chevre: "chevre",
    });
    // The delicious formula checks brie first, which is still present, so the
    // formula never checked `'chevre' in object`. As a result, the formula is
    // still valid.
    expect(delicious.state).toEqual([true, "stable"]);

    delete object["brie"];
    expect(object).toEqual({ "hot dogs": "hot dogs", chevre: "chevre" });
    expect(delicious.state).toEqual([true, "invalidated"]);

    delete object["chevre"];
    expect(object).toEqual({ "hot dogs": "hot dogs" });
    expect(delicious.state).toEqual([false, "invalidated"]);

    delete object["hot dogs"];
    expect(object).toEqual({});
    // The delicious formula checks chevre and brie, but neither of those properties changed
    expect(delicious.state).toEqual([false, "stable"]);
  });

  test("iterating the object invalidates if the items are added", () => {
    const object = reactive.object<Record<string, string>>({});

    const keys = Invalidation.trace(() => Object.keys(object));
    const values = Invalidation.trace(() => Object.values(object));
    const entries = Invalidation.trace(() => Object.entries(object));

    expect(keys.state).toEqual([[], "initialized"]);
    expect(values.state).toEqual([[], "initialized"]);
    expect(entries.state).toEqual([[], "initialized"]);

    object["hot dogs"] = "hot dogs";
    expect(object).toEqual({ "hot dogs": "hot dogs" });
    expect(keys.state).toEqual([["hot dogs"], "invalidated"]);
    expect(values.state).toEqual([["hot dogs"], "invalidated"]);
    expect(entries.state).toEqual([[["hot dogs", "hot dogs"]], "invalidated"]);

    object["hot dogs"] = "hot dogs";
    expect(object).toEqual({ "hot dogs": "hot dogs" });
    expect(keys.state).toEqual([["hot dogs"], "stable"]);
    expect(values.state).toEqual([["hot dogs"], "stable"]);
    expect(entries.state).toEqual([[["hot dogs", "hot dogs"]], "stable"]);

    object["hot dogs"] = "sandwich";
    expect(object).toEqual({ "hot dogs": "sandwich" });
    // can we make this stable?
    expect(keys.state).toEqual([["hot dogs"], "invalidated"]);
    expect(values.state).toEqual([["sandwich"], "invalidated"]);
    expect(entries.state).toEqual([[["hot dogs", "sandwich"]], "invalidated"]);

    object["hot dogs"] = "sandwich";
    expect(object).toEqual({ "hot dogs": "sandwich" });
    expect(keys.state).toEqual([["hot dogs"], "stable"]);
    expect(values.state).toEqual([["sandwich"], "stable"]);
    expect(entries.state).toEqual([[["hot dogs", "sandwich"]], "stable"]);

    delete object["hot dogs"];
    expect(object).toEqual({});
    expect(keys.state).toEqual([[], "invalidated"]);
    expect(values.state).toEqual([[], "invalidated"]);
    expect(entries.state).toEqual([[], "invalidated"]);
  });

  test("if the second item in a short-circuit changed, updating the first item invalidates", () => {
    const object = reactive.object<Record<string, string>>({});

    const delicious = Invalidation.trace(
      () => "brie" in object || "chevre" in object
    );

    expect(delicious.state).toEqual([false, "initialized"]);

    object["hot dogs"] = "hot dogs";
    expect(object).toEqual({ "hot dogs": "hot dogs" });
    expect(delicious.state).toEqual([false, "stable"]);

    object["chevre"] = "chevre";
    expect(object).toEqual({ "hot dogs": "hot dogs", chevre: "chevre" });
    expect(delicious.state).toEqual([true, "invalidated"]);

    //   object["chevre"] = "chevre";
    //   expect(object).toEqual({
    //     "hot dogs": "hot dogs",
    //     brie: "brie",
    //     chevre: "chevre",
    //   });
    //   expect(delicious.state).toEqual([true, "stable"]);

    //   delete object["brie"];
    //   expect(object).toEqual({ "hot dogs": "hot dogs", chevre: "chevre" });
    //   expect(delicious.state).toEqual([true, "invalidated"]);

    //   delete object["chevre"];
    //   expect(object).toEqual({ "hot dogs": "hot dogs" });
    //   expect(delicious.state).toEqual([false, "invalidated"]);

    //   delete object["hot dogs"];
    //   expect(object).toEqual({});
    //   expect(delicious.state).toEqual([false, "stable"]);
  });
});
