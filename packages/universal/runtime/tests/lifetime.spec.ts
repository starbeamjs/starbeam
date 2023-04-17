import { RUNTIME } from "@starbeam/runtime";
import { describe, expect, test } from "vitest";

describe("lifetimes", () => {
  test("registering a finalizer", () => {
    const object = {};
    const [tracer, finalizer] = InstrumentedCallback.create();

    RUNTIME.onFinalize(object, finalizer);

    // The finalizer isn't initially called
    expect(tracer.calls).toBe(0);

    RUNTIME.finalize(object);

    // It's called once when the object is finalized
    expect(tracer.calls).toBe(1);

    RUNTIME.finalize(object);

    // Finalizing a second time is a noop
    expect(tracer.calls).toBe(1);
  });

  test("registering multiple finalizers", () => {
    const object = {};
    const [tracer1, finalizer1] = InstrumentedCallback.create();
    const [tracer2, finalizer2] = InstrumentedCallback.create();

    RUNTIME.onFinalize(object, finalizer1);
    RUNTIME.onFinalize(object, finalizer2);

    // The finalizers aren't initially called
    expect(tracer1.calls).toBe(0);
    expect(tracer2.calls).toBe(0);

    RUNTIME.finalize(object);

    // They're called once when the object is finalized
    expect(tracer1.calls).toBe(1);
    expect(tracer2.calls).toBe(1);

    RUNTIME.finalize(object);

    // Finalizing a second time is a noop
    expect(tracer1.calls).toBe(1);
    expect(tracer2.calls).toBe(1);
  });

  test("registering the same finalizer after finalization doesn't do anything", () => {
    const object = {};
    const [tracer, finalizer] = InstrumentedCallback.create();

    RUNTIME.finalize(object);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    RUNTIME.onFinalize(object, finalizer);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);
  });

  test("registering a different finalizer after finalization doesn't do anything", () => {
    const object = {};
    const [tracer1, finalizer1] = InstrumentedCallback.create();
    const [tracer2, finalizer2] = InstrumentedCallback.create();

    RUNTIME.finalize(object);

    // The finalizers aren't called
    expect(tracer1.calls).toBe(0);
    expect(tracer2.calls).toBe(0);

    RUNTIME.onFinalize(object, finalizer1);
    RUNTIME.onFinalize(object, finalizer2);

    // The finalizers aren't called
    expect(tracer1.calls).toBe(0);
    expect(tracer2.calls).toBe(0);
  });

  test("registering the same finalizer twice doesn't cause it to get executed multiple times", () => {
    const object = {};
    const [tracer, finalizer] = InstrumentedCallback.create();

    RUNTIME.onFinalize(object, finalizer);
    RUNTIME.onFinalize(object, finalizer);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    RUNTIME.finalize(object);

    // It's called once when the object is finalized
    expect(tracer.calls).toBe(1);

    RUNTIME.finalize(object);

    // Finalizing a second time is a noop
    expect(tracer.calls).toBe(1);
  });

  test("registering a finalizer for a different object doesn't cause it to get executed", () => {
    const object1 = {};
    const object2 = {};
    const [tracer, finalizer] = InstrumentedCallback.create();

    RUNTIME.onFinalize(object1, finalizer);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    RUNTIME.finalize(object2);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    RUNTIME.finalize(object1);

    // It's called once when the object is finalized
    expect(tracer.calls).toBe(1);

    RUNTIME.finalize(object1);

    // Finalizing a second time is a noop
    expect(tracer.calls).toBe(1);
  });

  test("unsubscribing a finalizer before finalization causes it not to be called", () => {
    const object = {};
    const [tracer, finalizer] = InstrumentedCallback.create();

    const unsubscribe = RUNTIME.onFinalize(object, finalizer);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    unsubscribe();

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    RUNTIME.finalize(object);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    // Adding it back does nothing
    RUNTIME.onFinalize(object, finalizer);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);

    // Finalizing again does nothing
    RUNTIME.finalize(object);

    // The finalizer isn't called
    expect(tracer.calls).toBe(0);
  });

  test("linking a child causes the child to be finalized when the parent is finalized", () => {
    const object1 = {};
    const object2 = {};
    const [tracer1, finalizer1] = InstrumentedCallback.create();
    const [tracer2, finalizer2] = InstrumentedCallback.create();

    RUNTIME.onFinalize(object1, finalizer1);
    RUNTIME.onFinalize(object2, finalizer2);

    RUNTIME.link(object1, object2);

    // The finalizers aren't called
    expect(tracer1.calls).toBe(0);
    expect(tracer2.calls).toBe(0);

    RUNTIME.finalize(object1);

    // The finalizers are called once when the object is finalized
    expect(tracer1.calls).toBe(1);
    expect(tracer2.calls).toBe(1);

    // explicitly finalizing the child doesn't do anything

    RUNTIME.finalize(object2);

    // The finalizers are still called once when the object is finalized, but aren't called again
    expect(tracer1.calls).toBe(1);

    // Linking the child to a new parent doesn't cause it to get called again
    const object3 = {};

    RUNTIME.link(object3, object2);

    RUNTIME.finalize(object3);

    // The finalizers are still called once when the object is finalized, but aren't called again
    expect(tracer1.calls).toBe(1);
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
