import { Marker } from "@starbeam/reactive";
import { Setup, Setups } from "@starbeam/resource";
import { RUNTIME } from "@starbeam/runtime";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

describe("Setup", () => {
  test("setups can invalidate themselves", () => {
    const lifetime = {};

    const { block, counts, invalidate } = TracedSetup("invalidator");
    const setup = Setup(lifetime, block);

    expect(counts).toStrictEqual({ init: 0, finalized: 0 });
    setup.read();
    expect(counts).toStrictEqual({ init: 1, finalized: 0 });
    setup.read();
    expect(counts).toStrictEqual({ init: 1, finalized: 0 });

    invalidate();
    setup.read();

    expect(counts).toStrictEqual({ init: 2, finalized: 1 });
    setup.read();
    expect(counts).toStrictEqual({ init: 2, finalized: 1 });

    RUNTIME.finalize(lifetime);
    expect(counts).toStrictEqual({ init: 2, finalized: 2 });

    // setups don't run again once their associated lifetime is finalized
    invalidate();
    setup.read();
    expect(counts).toStrictEqual({ init: 2, finalized: 2 });
  });
});

describe("Setups", () => {
  test("setups can invalidate themselves", () => {
    const lifetime = {};

    const setups = Setups(lifetime);
    const setup1 = TracedSetup("setup1");
    const setup2 = TracedSetup("setup2");

    setups.add(setup1.block);
    // we didn't poll setups yet, so setup1 is not yet initialized
    expect(setup1.counts).toStrictEqual({ init: 0, finalized: 0 });

    setups.poll();
    expect(setup1.counts).toStrictEqual({ init: 1, finalized: 0 });

    setups.poll();
    // setup1 is still valid, so polling the Setups doesn't cause it
    // to run again.
    expect(setup1.counts).toStrictEqual({ init: 1, finalized: 0 });

    setup1.invalidate();
    // we didn't poll setups yet
    expect(setup1.counts).toStrictEqual({ init: 1, finalized: 0 });

    setups.poll();
    // setup1 is invalid, so polling the Setups finalizes it and runs
    // the initialization again.
    expect(setup1.counts).toStrictEqual({ init: 2, finalized: 1 });

    // adding a new setup invalidates the Setups
    setups.add(setup2.block);
    // but nothing happens until the Setups are polled
    expect(setup2.counts).toStrictEqual({ init: 0, finalized: 0 });

    setups.poll();
    // setup1 remains valid, so it isn't finalized
    expect(setup1.counts).toStrictEqual({ init: 2, finalized: 1 });
    // but setup2 hasn't run yet, so it gets initialized
    expect(setup2.counts).toStrictEqual({ init: 1, finalized: 0 });

    // nothing is invalidated, so neither of the Setups runs again
    setups.poll();
    expect(setup1.counts).toStrictEqual({ init: 2, finalized: 1 });
    expect(setup2.counts).toStrictEqual({ init: 1, finalized: 0 });

    RUNTIME.finalize(lifetime);

    // finalizing the Setups finalizes each Setup
    expect(setup1.counts).toStrictEqual({ init: 2, finalized: 2 });
    expect(setup2.counts).toStrictEqual({ init: 1, finalized: 1 });

    // invalidating each of the setups has no effect since the Setups are
    // finalized
    setup1.invalidate();
    setup2.invalidate();

    setups.poll();

    expect(setup1.counts).toStrictEqual({ init: 2, finalized: 2 });
    expect(setup2.counts).toStrictEqual({ init: 1, finalized: 1 });
  });
});

function TracedSetup(name: string) {
  const counts = { init: 0, finalized: 0 };
  const marker = Marker(`marker-${name}`);

  const block = () => {
    counts.init++;
    marker.read();

    return () => {
      counts.finalized++;
    };
  };

  return {
    block,
    counts,
    invalidate: () => void marker.mark(),
  };
}
