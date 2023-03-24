import { callerStack, Desc } from "@starbeam/debug";
import type { Tagged } from "@starbeam/interfaces";
import {
  CellTag,
  dependenciesInTaggedList,
  FormulaTag,
  getTag,
  lastUpdatedInTaggedList,
  zero,
} from "@starbeam/tags";
import { TAG, TIMELINE } from "@starbeam/timeline";
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

      expect(String(getTag(tom).lastUpdated)).toBe(String(zero()));
      expect(String(lastUpdatedInTaggedList([tom]))).toBe(String(zero()));
    });

    it("has no dependencies", () => {
      const tom = Static("Tom Dale");

      expect([...getTag(tom).dependencies()]).toEqual([]);
      expect([...dependenciesInTaggedList([tom])]).toEqual([]);
    });
  });

  describe("Cell", () => {
    it("has the current timestamp for lastUpdated", () => {
      const original = TIMELINE.now;
      const tom = Cell("Tom");
      expect(String(getTag(tom).lastUpdated)).toBe(String(TIMELINE.now));
      const nullvox = Cell("nullvox");
      const nullvoxTimestamp = TIMELINE.now;

      expect(String(getTag(nullvox).lastUpdated), "lastUpdated(nullvox)").toBe(
        String(nullvoxTimestamp)
      );
      expect(
        String(lastUpdatedInTaggedList([tom, nullvox])),
        "lastUpdatedIn([tom,nullvox])"
      ).toBe(String(TIMELINE.now));

      expect(String(TIMELINE.now)).not.toBe(String(original));

      console.log("reading", TIMELINE.now);
      tom.read();
      console.log("writing", TIMELINE.now);
      tom.current = "Tom Dale";
      console.log("wrote", TIMELINE.now);
      expect(String(TIMELINE.now), "TIMELINE.now").not.toBe(String(original));
      expect(String(getTag(tom).lastUpdated), "lastUpdated(tom)").toBe(
        String(TIMELINE.now)
      );
      expect(String(getTag(nullvox).lastUpdated)).toBe(
        String(nullvoxTimestamp)
      );
      expect(String(lastUpdatedInTaggedList([tom, nullvox]))).toBe(
        String(TIMELINE.now)
      );
    });

    it("has itself as a dependency", () => {
      const tom = Cell("Tom");
      const nullvox = Cell("nullvox");

      expect([...getTag(tom).dependencies()]).toEqual([tom[TAG]]);
      expect([...dependenciesInTaggedList([tom, nullvox])]).toEqual([
        tom[TAG],
        nullvox[TAG],
      ]);
    });

    it("has no dependencies if it's frozen", () => {
      const tom = FreezableCell("tom");
      const nullvox = FreezableCell("nullvox");
      tom.freeze();

      nullvox.current = "@nullvoxpopuli";

      expect([...getTag(tom).dependencies()]).toEqual([]);
      expect([...dependenciesInTaggedList([tom, nullvox])]).toEqual([
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

      expect(String(getTag(Both).lastUpdated)).toBe(String(TIMELINE.now));

      expect([...getTag(Both).dependencies()]).toEqual([
        tom[TAG],
        nullvox[TAG],
      ]);

      tom.current = "Tom Dale";

      expect(String(getTag(Both).lastUpdated)).toBe(String(TIMELINE.now));
    });
  });
});
