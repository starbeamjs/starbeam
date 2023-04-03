import { Cell, Marker } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";
import { CONTEXT } from "@starbeam/runtime";
import { service } from "@starbeam/service";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

describe("service", () => {
  test("should be able to create a service", () => {
    const counts = { init: 0, finalized: 0 };
    const invalidate = Marker();
    const Counter = Resource(({ on }) => {
      counts.init++;
      invalidate.read();
      const count = Cell(0);
      on.cleanup(() => counts.finalized++);
      return {
        get count() {
          return count.current;
        },
        increment() {
          count.current++;
        },
      };
    });

    const app = {};
    CONTEXT.app = app;
    const counter = service(Counter);

    expect(counter.current.count).toBe(0);
    expect(counts.init).toBe(1);

    counter.current.increment();
    expect(counter.current.count).toBe(1);
    expect(counts.init).toBe(1);

    invalidate.mark();
    expect(counter.current.count).toBe(0);
    expect(counts.init).toBe(2);
    expect(counts.finalized).toBe(1);
  });
});
