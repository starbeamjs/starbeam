import { callerStack, Desc } from "@starbeam/debug";
import type { Tagged } from "@starbeam/interfaces";
import { CellTag, FormulaTag, zero } from "@starbeam/tags";
import { TAG, TaggedUtils, TIMELINE } from "@starbeam/timeline";
import { beforeAll, describe, expect, it } from "vitest";

import { Cell, FreezableCell, Static } from "./support/mini-reactives.js";

describe("Tagged", () => {
  beforeAll(() => {
    // make sure the timeline is not at 0, which would make a comparison with TIMELINE.now sometimes
    // equivalent to Timestamp.zero(), and we want to test the difference.
    TIMELINE.bump(CellTag.create(Desc("cell"), zero()), callerStack(-1));
  });
  describe("Static", () => {
    it("has the zero timestamp for lastUpdated", () => {
      const tom = Static("Tom Dale");

      expect(String(TaggedUtils.lastUpdated(tom))).toBe(String(zero()));
      expect(String(TaggedUtils.lastUpdatedIn([tom]))).toBe(String(zero()));
    });

    it("has no dependencies", () => {
      const tom = Static("Tom Dale");

      expect([...TaggedUtils.dependencies(tom)]).toEqual([]);
      expect([...TaggedUtils.dependenciesInList([tom])]).toEqual([]);
    });
  });

  describe("Cell", () => {
    it("has the current timestamp for lastUpdated", () => {
      const original = TIMELINE.now;
      const tom = Cell("Tom");
      expect(String(TaggedUtils.lastUpdated(tom))).toBe(String(TIMELINE.now));
      const nullvox = Cell("nullvox");
      const nullvoxTimestamp = TIMELINE.now;

      expect(
        String(TaggedUtils.lastUpdated(nullvox)),
        "lastUpdated(nullvox)"
      ).toBe(String(nullvoxTimestamp));
      expect(
        String(TaggedUtils.lastUpdatedIn([tom, nullvox])),
        "lastUpdatedIn([tom,nullvox])"
      ).toBe(String(TIMELINE.now));

      expect(String(TIMELINE.now)).not.toBe(String(original));

      console.log("reading", TIMELINE.now);
      tom.read();
      console.log("writing", TIMELINE.now);
      tom.current = "Tom Dale";
      console.log("wrote", TIMELINE.now);
      expect(String(TIMELINE.now), "TIMELINE.now").not.toBe(String(original));
      expect(String(TaggedUtils.lastUpdated(tom)), "lastUpdated(tom)").toBe(
        String(TIMELINE.now)
      );
      expect(String(TaggedUtils.lastUpdated(nullvox))).toBe(
        String(nullvoxTimestamp)
      );
      expect(String(TaggedUtils.lastUpdatedIn([tom, nullvox]))).toBe(
        String(TIMELINE.now)
      );
    });

    it("has itself as a dependency", () => {
      const tom = Cell("Tom");
      const nullvox = Cell("nullvox");

      expect([...TaggedUtils.dependencies(tom)]).toEqual([tom[TAG]]);
      expect([...TaggedUtils.dependenciesInList([tom, nullvox])]).toEqual([
        tom[TAG],
        nullvox[TAG],
      ]);
    });

    it("has no dependencies if it's frozen", () => {
      const tom = FreezableCell("tom");
      const nullvox = FreezableCell("nullvox");
      tom.freeze();

      nullvox.current = "@nullvoxpopuli";

      expect([...TaggedUtils.dependencies(tom)]).toEqual([]);
      expect([...TaggedUtils.dependenciesInList([tom, nullvox])]).toEqual([
        nullvox[TAG],
      ]);
    });
  });

  describe("Composite", () => {
    it("has the maximum timestamp of its dependencies", () => {
      const tom = Cell("Tom");
      const nullvox = Cell("nullvox");

      const formula = FormulaTag.create(Desc("formula"), () => [tom, nullvox]);

      const Both: Tagged = {
        [TAG]: formula,
      };

      expect(String(TaggedUtils.lastUpdated(Both))).toBe(String(TIMELINE.now));

      expect([...TaggedUtils.dependencies(Both)]).toEqual([
        tom[TAG],
        nullvox[TAG],
      ]);

      tom.current = "Tom Dale";

      expect(String(TaggedUtils.lastUpdated(Both))).toBe(String(TIMELINE.now));
    });
  });
});
