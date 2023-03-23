import { callerStack, descriptionFrom } from "@starbeam/debug";
import type { FormulaCore } from "@starbeam/interfaces";
import {
  REACTIVE,
  SubscriptionTarget,
  TIMELINE,
  zero,
} from "@starbeam/timeline";
import { beforeAll, describe, expect, it } from "vitest";

import { Cell, FreezableCell, Static } from "./support/mini-reactives.js";

describe("SubscriptionTarget", () => {
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

      expect(String(SubscriptionTarget.lastUpdated(tom))).toBe(String(zero()));
      expect(String(SubscriptionTarget.lastUpdatedIn([tom]))).toBe(
        String(zero())
      );
    });

    it("has no dependencies", () => {
      const tom = Static("Tom Dale");

      expect([...SubscriptionTarget.dependencies(tom)]).toEqual([]);
      expect([...SubscriptionTarget.dependenciesInList([tom])]).toEqual([]);
    });
  });

  describe("Cell", () => {
    it("has the current timestamp for lastUpdated", () => {
      const original = TIMELINE.now;
      const tom = Cell("Tom");
      expect(String(SubscriptionTarget.lastUpdated(tom))).toBe(
        String(TIMELINE.now)
      );
      const nullvox = Cell("nullvox");
      const nullvoxTimestamp = TIMELINE.now;

      expect(String(SubscriptionTarget.lastUpdated(nullvox))).toBe(
        String(nullvoxTimestamp)
      );
      expect(String(SubscriptionTarget.lastUpdatedIn([tom, nullvox]))).toBe(
        String(TIMELINE.now)
      );

      expect(String(TIMELINE.now)).not.toBe(String(original));

      tom.current = "Tom Dale";
      expect(String(TIMELINE.now)).not.toBe(String(original));
      expect(String(SubscriptionTarget.lastUpdated(tom))).toBe(
        String(TIMELINE.now)
      );
      expect(String(SubscriptionTarget.lastUpdated(nullvox))).toBe(
        String(nullvoxTimestamp)
      );
      expect(String(SubscriptionTarget.lastUpdatedIn([tom, nullvox]))).toBe(
        String(TIMELINE.now)
      );
    });

    it("has itself as a dependency", () => {
      const tom = Cell("Tom");
      const nullvox = Cell("nullvox");

      expect([...SubscriptionTarget.dependencies(tom)]).toEqual([
        tom[REACTIVE],
      ]);
      expect([
        ...SubscriptionTarget.dependenciesInList([tom, nullvox]),
      ]).toEqual([tom[REACTIVE], nullvox[REACTIVE]]);
    });

    it("has no dependencies if it's frozen", () => {
      const tom = FreezableCell("tom");
      const nullvox = FreezableCell("nullvox");
      tom.freeze();

      nullvox.current = "@nullvoxpopuli";

      expect([...SubscriptionTarget.dependencies(tom)]).toEqual([]);
      expect([
        ...SubscriptionTarget.dependenciesInList([tom, nullvox]),
      ]).toEqual([nullvox[REACTIVE]]);
    });
  });

  describe("Composite", () => {
    it("has the maximum timestamp of its dependencies", () => {
      const tom = Cell("Tom");
      const nullvox = Cell("nullvox");

      const composite: FormulaCore = {
        type: "composite",
        description: descriptionFrom({
          type: "formula",
          api: "Composite",
        }),
        children() {
          return [tom, nullvox];
        },
      };

      const Both: SubscriptionTarget = {
        [REACTIVE]: composite,
      };

      expect(String(SubscriptionTarget.lastUpdated(Both))).toBe(
        String(TIMELINE.now)
      );

      expect([...SubscriptionTarget.dependencies(Both)]).toEqual([
        tom[REACTIVE],
        nullvox[REACTIVE],
      ]);

      tom.current = "Tom Dale";

      expect(String(SubscriptionTarget.lastUpdated(Both))).toBe(
        String(TIMELINE.now)
      );
    });
  });
});
