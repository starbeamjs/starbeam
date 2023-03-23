import { callerStack, descriptionFrom } from "@starbeam/debug";
import type { FormulaTag } from "@starbeam/interfaces";
import { TAG, Tagged, TIMELINE, zero } from "@starbeam/timeline";
import { beforeAll, describe, expect, it } from "vitest";

import { Cell, FreezableCell, Static } from "./support/mini-reactives.js";

describe("Tagged", () => {
  beforeAll(() => {
    // make sure the timeline is not at 0, which would make a comparison with TIMELINE.now sometimes
    // equivalent to Timestamp.zero(), and we want to test the difference.
    TIMELINE.bump(
      {
        type: "mutable",
        description: descriptionFrom({
          type: "cell",
          api: "Cell",
        }),
        lastUpdated: zero(),
      },
      callerStack(-1)
    );
  });
  describe("Static", () => {
    it("has the zero timestamp for lastUpdated", () => {
      const tom = Static("Tom Dale");

      expect(String(Tagged.lastUpdated(tom))).toBe(String(zero()));
      expect(String(Tagged.lastUpdatedIn([tom]))).toBe(String(zero()));
    });

    it("has no dependencies", () => {
      const tom = Static("Tom Dale");

      expect([...Tagged.dependencies(tom)]).toEqual([]);
      expect([...Tagged.dependenciesInList([tom])]).toEqual([]);
    });
  });

  describe("Cell", () => {
    it("has the current timestamp for lastUpdated", () => {
      const original = TIMELINE.now;
      const tom = Cell("Tom");
      expect(String(Tagged.lastUpdated(tom))).toBe(String(TIMELINE.now));
      const nullvox = Cell("nullvox");
      const nullvoxTimestamp = TIMELINE.now;

      expect(String(Tagged.lastUpdated(nullvox))).toBe(
        String(nullvoxTimestamp)
      );
      expect(String(Tagged.lastUpdatedIn([tom, nullvox]))).toBe(
        String(TIMELINE.now)
      );

      expect(String(TIMELINE.now)).not.toBe(String(original));

      tom.current = "Tom Dale";
      expect(String(TIMELINE.now)).not.toBe(String(original));
      expect(String(Tagged.lastUpdated(tom))).toBe(String(TIMELINE.now));
      expect(String(Tagged.lastUpdated(nullvox))).toBe(
        String(nullvoxTimestamp)
      );
      expect(String(Tagged.lastUpdatedIn([tom, nullvox]))).toBe(
        String(TIMELINE.now)
      );
    });

    it("has itself as a dependency", () => {
      const tom = Cell("Tom");
      const nullvox = Cell("nullvox");

      expect([...Tagged.dependencies(tom)]).toEqual([tom[TAG]]);
      expect([...Tagged.dependenciesInList([tom, nullvox])]).toEqual([
        tom[TAG],
        nullvox[TAG],
      ]);
    });

    it("has no dependencies if it's frozen", () => {
      const tom = FreezableCell("tom");
      const nullvox = FreezableCell("nullvox");
      tom.freeze();

      nullvox.current = "@nullvoxpopuli";

      expect([...Tagged.dependencies(tom)]).toEqual([]);
      expect([...Tagged.dependenciesInList([tom, nullvox])]).toEqual([
        nullvox[TAG],
      ]);
    });
  });

  describe("Composite", () => {
    it("has the maximum timestamp of its dependencies", () => {
      const tom = Cell("Tom");
      const nullvox = Cell("nullvox");

      const composite: FormulaTag = {
        type: "formula",
        description: descriptionFrom({
          type: "formula",
          api: "Composite",
        }),
        children() {
          return [tom, nullvox];
        },
      };

      const Both: Tagged = {
        [TAG]: composite,
      };

      expect(String(Tagged.lastUpdated(Both))).toBe(String(TIMELINE.now));

      expect([...Tagged.dependencies(Both)]).toEqual([tom[TAG], nullvox[TAG]]);

      tom.current = "Tom Dale";

      expect(String(Tagged.lastUpdated(Both))).toBe(String(TIMELINE.now));
    });
  });
});
