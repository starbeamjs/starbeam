/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Cell, Marker } from "@starbeam/reactive";
import type { Handler, RendererManager } from "@starbeam/renderer";
import {
  managerSetupReactive,
  managerSetupResource,
  managerSetupService,
} from "@starbeam/renderer";
import { Resource } from "@starbeam/resource";
import { finalize } from "@starbeam/shared";
import {
  describe,
  expect,
  RecordedEvents,
  test,
} from "@starbeam-workspace/test-utils";

const INITIAL = 0;

describe("RendererManager", () => {
  test("smoke test", () => {
    const manager = TestManager.create();

    const cell = Cell(INITIAL);
    const reactive = managerSetupReactive(manager, () => cell.current);
    expect(reactive.current).toBe(INITIAL);
  });

  test("setupReactive reads reactive values", () => {
    const manager = TestManager.create();
    const cell = Cell(INITIAL);
    const reactive = managerSetupReactive(manager, cell);

    expect(reactive.current).toBe(INITIAL);

    cell.current = 1;
    expect(reactive.current).toBe(1);
  });

  test("setupReactive uses the latest blueprint ref", () => {
    const manager = TestManager.create();
    const first = Cell(1);
    const second = Cell(2);

    const reactive = managerSetupReactive(manager, () => first.current);
    expect(reactive.current).toBe(1);

    managerSetupReactive(manager, () => second.current);
    expect(reactive.current).toBe(1);

    first.current = 10;
    expect(reactive.current).toBe(2);

    second.current = 3;
    expect(reactive.current).toBe(3);
  });

  test("setupResource defers sync and subscriptions until mounted", () => {
    const manager = TestManager.create();
    const events = new RecordedEvents();
    const invalidate = Marker();

    const Counter = Resource(({ on }) => {
      events.record("resource:setup");
      const count = Cell(0);

      on.sync(() => {
        events.record("resource:sync");
        invalidate.read();
      });

      return {
        get count() {
          return count.current;
        },
      };
    });

    const counter = managerSetupResource(manager, Counter);
    expect(counter.count).toBe(0);
    events.expect("resource:setup");

    invalidate.mark();
    events.expect([]);
    expect(manager.scheduledCount).toBe(0);

    manager.mount();
    events.expect("resource:sync");

    invalidate.mark();
    events.expect([]);
    expect(manager.scheduledCount).toBe(1);

    manager.flushScheduled();
    events.expect("resource:sync");

    invalidate.mark();
    manager.flushScheduled();
    events.expect("resource:sync");
  });

  test("setupResource unsubscribes from runtime invalidation when finalized", () => {
    const manager = TestManager.create();
    const events = new RecordedEvents();
    const invalidate = Marker();

    const Counter = Resource(({ on }) => {
      events.record("resource:setup");

      on.sync(() => {
        events.record("resource:sync");
        invalidate.read();
      });

      return {};
    });

    managerSetupResource(manager, Counter);
    events.expect("resource:setup");

    manager.mount();
    events.expect("resource:sync");

    finalize(manager.component);

    invalidate.mark();
    expect(manager.scheduledCount).toBe(0);

    manager.flushScheduled();
    events.expect([]);
  });

  test("setupService shares service instances for a stable app", () => {
    const app = {};
    const first = TestManager.create({ app });
    const second = TestManager.create({ app });
    let setups = 0;

    const Counter = Resource(() => {
      const count = Cell(++setups);

      return {
        get count() {
          return count.current;
        },
        increment() {
          count.current++;
        },
      };
    });

    const firstCounter = managerSetupService(first, Counter);
    const secondCounter = managerSetupService(second, Counter);

    expect(firstCounter).toBe(secondCounter);
    expect(firstCounter.count).toBe(1);

    secondCounter.increment();
    expect(firstCounter.count).toBe(2);
    expect(setups).toBe(1);
  });
});

class TestManager implements RendererManager<object> {
  static create(options: { app?: object } = {}): TestManager {
    return new TestManager(options.app);
  }

  readonly component = {};
  readonly #app: object | undefined;
  readonly #values = new WeakMap<() => unknown, unknown>();
  readonly #refs = new Map<object, { current: unknown }>();
  readonly #mountedHandlers = new Set<Handler>();
  readonly #idleHandlers = new Set<Handler>();
  readonly #layoutHandlers = new Set<Handler>();
  readonly #schedulerHandlers = new Set<Handler>();
  #scheduledCount = 0;

  private constructor(app: object | undefined) {
    this.#app = app;
  }

  get scheduledCount(): number {
    return this.#scheduledCount;
  }

  getComponent = (): object => this.component;
  getApp = (): object | undefined => this.#app;

  setupValue = <T>(_instance: object, create: () => T): T => {
    if (this.#values.has(create)) {
      return this.#values.get(create) as T;
    }

    const value = create();
    this.#values.set(create, value);
    return value;
  };

  setupRef = <T>(instance: object, value: T): { readonly current: T } => {
    let ref = this.#refs.get(instance);

    if (!ref) {
      ref = { current: value };
      this.#refs.set(instance, ref);
    } else {
      ref.current = value;
    }

    return ref as { readonly current: T };
  };

  createNotifier = (): (() => void) => () => {};

  createScheduler = (): {
    readonly onSchedule: (handler: Handler) => void;
    readonly schedule: () => void;
  } => ({
    onSchedule: (handler) => void this.#schedulerHandlers.add(handler),
    schedule: () => void this.#scheduledCount++,
  });

  on = {
    mounted: (_instance: object, handler: Handler): void => {
      this.#mountedHandlers.add(handler);
    },
    idle: (_instance: object, handler: Handler): void => {
      this.#idleHandlers.add(handler);
    },
    layout: (_instance: object, handler: Handler): void => {
      this.#layoutHandlers.add(handler);
    },
  };

  mount(): void {
    run(this.#mountedHandlers);
  }

  flushScheduled(): void {
    this.#scheduledCount = 0;
    run(this.#schedulerHandlers);
  }
}

function run(handlers: Set<Handler>): void {
  for (const handler of handlers) handler();
}
