import { LIFETIME } from "@starbeam/runtime";
import { describe, expect, test } from "vitest";

describe("lifetimes", () => {
  test("registering a finalizer", () => {
    const object = {};
    const [tracer, finalizer] = InstrumentedCallback.create();

    LIFETIME.on.cleanup(object, finalizer);

    // The finalizer isn't initially called
    expect(tracer.calls).toBe(0);

    LIFETIME.finalize(object);

    // It's called once when the object is finalized
    expect(tracer.calls).toBe(1);

    LIFETIME.finalize(object);

    // Finalizing a second time is a noop
    expect(tracer.calls).toBe(1);
  });

  test("registering multiple finalizers", () => {
    const object = {};
    const [tracer1, finalizer1] = InstrumentedCallback.create();
    const [tracer2, finalizer2] = InstrumentedCallback.create();

    LIFETIME.on.cleanup(object, finalizer1);
    LIFETIME.on.cleanup(object, finalizer2);

    // The finalizers aren't initially called
    expect(tracer1.calls).toBe(0);
    expect(tracer2.calls).toBe(0);

    LIFETIME.finalize(object);

    // They're called once when the object is finalized
    expect(tracer1.calls).toBe(1);
    expect(tracer2.calls).toBe(1);

    LIFETIME.finalize(object);

    // Finalizing a second time is a noop
    expect(tracer1.calls).toBe(1);
    expect(tracer2.calls).toBe(1);
  });

  test("registering the same finalizer after finalization doesn't do anything", () => {
    const object = {};
    const [tracer, finalizer] = InstrumentedCallback.create();

    LIFETIME.finalize(object);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    LIFETIME.on.cleanup(object, finalizer);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);
  });

  test("registering a different finalizer after finalization doesn't do anything", () => {
    const object = {};
    const [tracer1, finalizer1] = InstrumentedCallback.create();
    const [tracer2, finalizer2] = InstrumentedCallback.create();

    LIFETIME.finalize(object);

    // The finalizers aren't called
    expect(tracer1.calls).toBe(0);
    expect(tracer2.calls).toBe(0);

    LIFETIME.on.cleanup(object, finalizer1);
    LIFETIME.on.cleanup(object, finalizer2);

    // The finalizers aren't called
    expect(tracer1.calls).toBe(0);
    expect(tracer2.calls).toBe(0);
  });

  test("registering the same finalizer twice doesn't cause it to get executed multiple times", () => {
    const object = {};
    const [tracer, finalizer] = InstrumentedCallback.create();

    LIFETIME.on.cleanup(object, finalizer);
    LIFETIME.on.cleanup(object, finalizer);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    LIFETIME.finalize(object);

    // It's called once when the object is finalized
    expect(tracer.calls).toBe(1);

    LIFETIME.finalize(object);

    // Finalizing a second time is a noop
    expect(tracer.calls).toBe(1);
  });

  test("registering a finalizer for a different object doesn't cause it to get executed", () => {
    const object1 = {};
    const object2 = {};
    const [tracer, finalizer] = InstrumentedCallback.create();

    LIFETIME.on.cleanup(object1, finalizer);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    LIFETIME.finalize(object2);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    LIFETIME.finalize(object1);

    // It's called once when the object is finalized
    expect(tracer.calls).toBe(1);

    LIFETIME.finalize(object1);

    // Finalizing a second time is a noop
    expect(tracer.calls).toBe(1);
  });

  test("unsubscribing a finalizer before finalization causes it not to be called", () => {
    const object = {};
    const [tracer, finalizer] = InstrumentedCallback.create();

    const unsubscribe = LIFETIME.on.cleanup(object, finalizer);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    unsubscribe();

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    LIFETIME.finalize(object);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    // Adding it back does nothing
    LIFETIME.on.cleanup(object, finalizer);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    // Finalizing again does nothing
    LIFETIME.finalize(object);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);
  });

  test("linking a child causes the child to be finalized when the parent is finalized", () => {
    const object1 = {};
    const object2 = {};
    const [tracer1, finalizer1] = InstrumentedCallback.create();
    const [tracer2, finalizer2] = InstrumentedCallback.create();

    LIFETIME.on.cleanup(object1, finalizer1);
    LIFETIME.on.cleanup(object2, finalizer2);

    LIFETIME.link(object1, object2);

    // The finalizers aren't called
    expect(tracer1.calls).toBe(0);
    expect(tracer2.calls).toBe(0);

    LIFETIME.finalize(object1);

    // The finalizers are called once when the object is finalized
    expect(tracer1.calls).toBe(1);
    expect(tracer2.calls).toBe(1);

    // explicitly finalizing the child doesn't do anything

    LIFETIME.finalize(object2);

    // The finalizers are still called once when the object is finalized, but aren't called again
    expect(tracer1.calls).toBe(1);

    // Linking the child to a new parent doesn't cause it to get called again
    const object3 = {};

    LIFETIME.link(object3, object2);

    LIFETIME.finalize(object3);

    // The finalizers are still called once when the object is finalized, but aren't called again
    expect(tracer1.calls).toBe(1);
  });

  test("adopting an object causes it to be unlinked from its previous value", () => {
    const root = {};
    const parent1 = {};
    const parent2 = {};
    const child = {};
    const [tracer, finalizer] = InstrumentedCallback.create();

    // setup
    {
      LIFETIME.on.cleanup(child, finalizer);

      LIFETIME.link(parent1, child, { root });

      // The finalizers aren't called
      expect(tracer.calls).toBe(0);
    }

    // The finalizers are not called once the child is adopted by a new owner.
    {
      LIFETIME.link(parent2, child, { root });
      LIFETIME.finalize(parent1);

      expect(tracer.calls).toBe(0);
    }

    // The finalizers are called once when the new parent is finalized
    {
      LIFETIME.finalize(parent2);

      expect(tracer.calls).toBe(1);
    }

    // but aren't called again, even if the child is directly finalized
    {
      LIFETIME.finalize(child);
      expect(tracer.calls).toBe(1);
    }

    // Linking the child to a new parent doesn't cause it to get called again
    {
      const parent3 = {};

      LIFETIME.link(parent3, child, { root });
      LIFETIME.finalize(parent3);
      expect(tracer.calls).toBe(1);
    }
  });
});

type Args = unknown[];

class InstrumentedCallback {
  static create(): [InstrumentedCallback, (...args: unknown[]) => void] {
    const instrumented = new InstrumentedCallback();
    const fn = (...args: unknown[]): void => {
      instrumented.#called.push(args);
    };

    return [instrumented, fn];
  }

  #called: Args[] = [];

  get calls(): number {
    return this.#called.length;
  }
}
