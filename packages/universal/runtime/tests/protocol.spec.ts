import type { Tagged } from "@starbeam/interfaces";
import { Cell, DEBUG, Static } from "@starbeam/reactive";
import { TAG } from "@starbeam/runtime";
import {
  createFormulaTag,
  getDependencies,
  getTag,
  lastUpdated,
  NOW,
  zero,
} from "@starbeam/tags";
import { describe, expect, it } from "vitest";

describe("Tagged", () => {
  describe("Static cells", () => {
    it("has the current timestamp for lastUpdated", () => {
      const tom = Static("Tom Dale");

      expect(String(lastUpdated(tom))).toBe(String(zero()));
      expect(String(lastUpdated(getTag(tom)))).toBe(String(zero()));
    });

    it("has no dependencies", () => {
      const tom = Static("Tom Dale");

      expect(getDependencies(getTag(tom))).toEqual([]);
      expect(getDependencies(tom)).toEqual([]);
    });
  });

  describe("Cell", () => {
    it("has the current timestamp for lastUpdated", () => {
      const original = NOW.now;
      const tom = Cell("Tom");
      expect(String(getTag(tom).lastUpdated)).toBe(String(NOW.now));
      const nullvox = Cell("nullvox");
      const nullvoxTimestamp = NOW.now;

      expect(String(getTag(nullvox).lastUpdated), "lastUpdated(nullvox)").toBe(
        String(nullvoxTimestamp)
      );
      expect(
        String(lastUpdated(tom, nullvox)),
        "lastUpdated(tom,nullvox)"
      ).toBe(String(NOW.now));

      expect(String(NOW.now)).not.toBe(String(original));

      tom.read();
      tom.current = "Tom Dale";
      expect(String(NOW.now), "NOW.now").not.toBe(String(original));
      expect(String(getTag(tom).lastUpdated), "lastUpdated(tom)").toBe(
        String(NOW.now)
      );
      expect(String(getTag(nullvox).lastUpdated)).toBe(
        String(nullvoxTimestamp)
      );
      expect(String(lastUpdated(tom, nullvox))).toBe(String(NOW.now));
    });

    it("has itself as a dependency", () => {
      const tom = Cell("Tom");
      const nullvox = Cell("nullvox");

      expect([...getDependencies(tom)]).toEqual([tom[TAG]]);
      expect([...getDependencies(tom, nullvox)]).toEqual([
        tom[TAG],
        nullvox[TAG],
      ]);
    });

    it("has no dependencies if it's frozen", () => {
      const tom = Cell("tom");
      const nullvox = Cell("nullvox");
      tom.freeze();

      nullvox.current = "@nullvoxpopuli";

      expect([...getDependencies(tom)]).toEqual([]);
      expect(getDependencies(tom, nullvox)).toEqual([nullvox[TAG]]);
    });
  });

  describe("FormulaTag", () => {
    it("has the maximum timestamp of its dependencies", () => {
      const tom = Cell("Tom");
      const nullvox = Cell("nullvox");

      const { tag, markInitialized } = createFormulaTag(
        DEBUG.Desc?.("formula"),
        () => new Set([getTag(tom), getTag(nullvox)])
      );

      const Both: Tagged = {
        [TAG]: tag,
      };

      // A formula's revision is zero() until it's initialized.
      expect(String(lastUpdated(Both))).toBe(String(zero()));

      markInitialized();

      expect(String(lastUpdated(Both))).toBe(String(NOW.now));

      expect(getDependencies(getTag(Both))).toEqual([tom[TAG], nullvox[TAG]]);

      tom.current = "Tom Dale";

      expect(String(lastUpdated(Both))).toBe(String(NOW.now));
    });
  });
});
