import {
  CachedFormula,
  Cell,
  type FormulaFn,
  Marker,
} from "@starbeam/reactive";
import { scoped } from "@starbeam/runtime";
import {
  finalize,
  mountFinalizationScope,
  onFinalize,
  pushFinalizationScope,
} from "@starbeam/shared";
import { Actions } from "@starbeam-workspace/test-utils";
import { describe, expect, test } from "vitest";

describe("a simplified resource (manual)", () => {
  function setup() {
    const actions = new Actions();
    const invalidate = Marker();
    const isSetup = Cell(false);

    function construct() {
      actions.record("construct");
      const instance = new Counter();

      function resource(parentLifetime: object) {
        let lastLifetime: object | undefined;
        let isFinalized = false;

        return CachedFormula(() => {
          if (isFinalized) return instance;
          if (lastLifetime) finalize(lastLifetime);

          if (isSetup.read()) {
            isFinalized = false;
            const doneParent = mountFinalizationScope(parentLifetime);
            const doneRun = pushFinalizationScope();
            Counter.setup(instance);
            actions.record("setup");

            onFinalize(() => {
              isFinalized = true;
              actions.record("cleanup");
              Counter.cleanup(instance);
            });

            invalidate.read();
            lastLifetime = doneRun();
            doneParent();
          }

          return instance;
        });
      }

      resource.instance = instance;
      resource.isSetup = isSetup;

      return resource;
    }

    return { actions, invalidate, resource: construct };
  }

  test("1. Construct", () => {
    const { actions, invalidate, resource } = setup();

    // Lifecycle:
    // 1. Construct. This returns an instance, but it's not linked to a parent
    //    scope, so it doesn't get cleaned up.

    const instance = resource().instance;
    actions.expect("construct");
    expect(instance.count).toBe(0);
  });

  test("2. Setup", () => {
    const invalidate = Marker();
    const actions = new Actions();

    const { resource } = createTestResource(actions, {
      label: "counter",
      createInstance: () => new Counter(),
      setupInstance: (instance) => {
        invalidate.read();
        Counter.setup(instance);

        return () => {
          Counter.cleanup(instance);
        };
      },
    });

    const initial = resource();

    expect(initial.instance.count).toBe(0);
    actions.expect("construct:counter");

    const parent = {};
    const counter = scoped(() => initial(parent), parent);

    expect(counter().count).toBe(0);
    actions.expect([]);

    // Incrementing before setup does nothing in this test, because it
    // emulates an increment that happens as a result of the setup.
    counter().increment();
    expect(counter().count).toBe(0);
    actions.expect([]);

    initial.isSetup.set(true);
    // urgent FIXME: freezing isSetup should work here, but freezing
    // isSetup results in the formula not being invalidated (despite
    // being *changed* since the last check).
    // initial.isSetup.freeze();

    expect(counter().count).toBe(0);
    actions.expect("setup:counter");

    counter().increment();
    expect(counter().count).toBe(1);
    actions.expect([]);

    invalidate.mark();
    expect(counter().count).toBe(1);
    actions.expect("cleanup:counter", "setup:counter");

    counter().increment();
    expect(counter().count).toBe(2);
    actions.expect([]);

    invalidate.mark();
    expect(counter().count).toBe(2);
    actions.expect("cleanup:counter", "setup:counter");

    counter().increment();
    expect(counter().count).toBe(3);
    actions.expect([]);

    finalize(parent);
    expect(counter().count).toBe(3);
    actions.expect("cleanup:counter");

    counter().increment();
    // since we emulated a cleanup, further increments do nothing.
    expect(counter().count).toBe(3);
    actions.expect([]);

    // invalidating the setup does nothing.
    invalidate.mark();
    expect(counter().count).toBe(3);
    actions.expect([]);

    // finalizing multiple times does nothing.
    finalize(parent);
    expect(counter().count).toBe(3);
    actions.expect();
  });

  test("3. Nested resources", () => {
    const invalidateParent = Marker();
    const invalidateChild = Marker();

    const actions = new Actions();

    const child = createTestResource(actions, {
      label: "child",
      createInstance: () => new Counter(),
      setupInstance: (instance) => {
        invalidateChild.read();
        Counter.setup(instance);

        return () => {
          Counter.cleanup(instance);
        };
      },
    });

    const parent = createTestResource(actions, {
      label: "parent",
      createInstance: () => {
        const initial = child.resource();

        return initial;
      },
      exposeInstance: (child) => child.instance,
      setupInstance: (child) => {
        invalidateParent.read();
        child.isSetup.set(true);
        child();

        return () => void null;
      },
    });

    const initial = parent.resource();
    actions.expect("construct:parent", "construct:child");

    expect(initial.instance.count).toBe(0);
  });
});

class Counter {
  static setup(counter: Counter) {
    counter.#isSetup = true;
  }

  static cleanup(counter: Counter) {
    counter.#isSetup = false;
  }

  #cell = Cell(0);
  #isSetup = false;

  get count() {
    return this.#cell.current;
  }

  increment() {
    // The check emulates what would happen if the increments were created
    // from something set up in setup rather than the test environment.
    if (this.#isSetup) {
      this.#cell.current++;
    }
  }
}

function createTestResource<const T, const U = T>(
  actions: Actions,
  {
    label,
    createInstance,
    exposeInstance = (value) => value as unknown as U,
    setupInstance,
  }: {
    label: string;
    createInstance: () => T;
    exposeInstance?: (value: T) => U;
    setupInstance: (value: T) => () => void;
  }
): {
  resource: () => {
    (parentLifetime?: object): FormulaFn<U>;
    instance: U;
    isSetup: Cell<boolean>;
  };
} {
  const isSetup = Cell(false);

  function construct() {
    actions.record(`construct:${label}`);

    // The instance may not consume reactive values (but, TODO, should be
    // allowed to lazily instantiate reactive values). It is also not linked
    // to a parent scope, because this phase is only run once.
    const instance = createInstance();
    const exposed = exposeInstance(instance);

    function resource(parentLifetime?: object) {
      let lastLifetime: object | undefined;
      let isFinalized = false;

      return CachedFormula(() => {
        if (isFinalized) return exposeInstance(instance);
        if (lastLifetime) finalize(lastLifetime);

        if (isSetup.read()) {
          isFinalized = false;
          const doneParent = parentLifetime
            ? mountFinalizationScope(parentLifetime)
            : pushFinalizationScope();
          const doneRun = pushFinalizationScope();
          const cleanupInstance = setupInstance(instance);
          actions.record(`setup:${label}`);

          onFinalize(() => {
            isFinalized = true;
            actions.record(`cleanup:${label}`);
            cleanupInstance();
          });

          lastLifetime = doneRun();
          doneParent();
        }

        return exposeInstance(instance);
      });
    }

    resource.instance = exposed;
    resource.isSetup = isSetup;

    return resource;
  }

  return { resource: construct };
}
