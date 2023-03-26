import { Desc } from "@starbeam/debug";
import type { Tagged } from "@starbeam/interfaces";
import { Cell, Static } from "@starbeam/reactive";
import { PUBLIC_TIMELINE, TAG } from "@starbeam/runtime";
import {
  dependenciesInTaggedList,
  FormulaTag,
  getTag,
  lastUpdatedInTaggedList,
  zero,
} from "@starbeam/tags";
import { describe, expect, it } from "vitest";

describe("Tagged", () => {
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
      const original = PUBLIC_TIMELINE.now;
      const tom = Cell("Tom");
      expect(String(getTag(tom).lastUpdated)).toBe(String(PUBLIC_TIMELINE.now));
      const nullvox = Cell("nullvox");
      const nullvoxTimestamp = PUBLIC_TIMELINE.now;

      expect(String(getTag(nullvox).lastUpdated), "lastUpdated(nullvox)").toBe(
        String(nullvoxTimestamp)
      );
      expect(
        String(lastUpdatedInTaggedList([tom, nullvox])),
        "lastUpdatedIn([tom,nullvox])"
      ).toBe(String(PUBLIC_TIMELINE.now));

      expect(String(PUBLIC_TIMELINE.now)).not.toBe(String(original));

      console.log("reading", PUBLIC_TIMELINE.now);
      tom.read();
      console.log("writing", PUBLIC_TIMELINE.now);
      tom.current = "Tom Dale";
      console.log("wrote", PUBLIC_TIMELINE.now);
      expect(String(PUBLIC_TIMELINE.now), "PUBLIC_TIMELINE.now").not.toBe(
        String(original)
      );
      expect(String(getTag(tom).lastUpdated), "lastUpdated(tom)").toBe(
        String(PUBLIC_TIMELINE.now)
      );
      expect(String(getTag(nullvox).lastUpdated)).toBe(
        String(nullvoxTimestamp)
      );
      expect(String(lastUpdatedInTaggedList([tom, nullvox]))).toBe(
        String(PUBLIC_TIMELINE.now)
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
      const tom = Cell("tom");
      const nullvox = Cell("nullvox");
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

      const formula = FormulaTag.create(Desc("formula"), () => [
        getTag(tom),
        getTag(nullvox),
      ]);

      const Both: Tagged = {
        [TAG]: formula,
      };

      expect(String(getTag(Both).lastUpdated)).toBe(
        String(PUBLIC_TIMELINE.now)
      );

      expect([...getTag(Both).dependencies()]).toEqual([
        tom[TAG],
        nullvox[TAG],
      ]);

      tom.current = "Tom Dale";

      expect(String(getTag(Both).lastUpdated)).toBe(
        String(PUBLIC_TIMELINE.now)
      );
    });
  });
});
