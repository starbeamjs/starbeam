import type { Reactive } from "@starbeam/interfaces";
import {
  CachedFormula,
  Formula,
  read,
  type ReadValue,
} from "@starbeam/reactive";
import { RUNTIME } from "@starbeam/runtime";
import { expect } from "vitest";

interface ResourceManager<Definition, Instance> {
  create: (definition: Definition, run: ResourceRun) => Instance;
  update: (
    definition: Definition,
    prev: Instance,
    next: ResourceRun
  ) => Instance;
}

class ResourceRun {
  static lifetime(lifetime: object) {
    const run = new ResourceRun();
    RUNTIME.link(lifetime, run);
    return run;
  }
}

interface ResourceState<Definition = object, Instance = object> {
  readonly definition: Definition;
  instance: Instance;
  run: ResourceRun;
  lifetime: object;
}

export function useResourceManager<
  Definition extends object,
  Instance extends object
>(
  definition: Definition,
  manager: ResourceManager<Definition, Instance>,
  lifetime: object
): Reactive<ReadValue<Instance>> {
  let prev: ResourceState<Definition, Instance>;
  let finalized = false;

  RUNTIME.onFinalize(lifetime, () => {
    finalized = true;
  });

  const formula = CachedFormula(() => {
    if (finalized) return prev.instance;

    if (prev) {
      RUNTIME.finalize(prev.run);
      prev.run = ResourceRun.lifetime(lifetime);
      prev.instance = manager.update(definition, prev.instance, prev.run);
    } else {
      const run = ResourceRun.lifetime(lifetime);
      const instance = manager.create(definition, run);
      RUNTIME.link(run, instance);
      prev = {
        definition,
        instance,
        run,
        lifetime,
      };
    }

    return prev.instance;
  });

  const resource = CachedFormula(() => read(formula()));

  return resource;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const { Cell, Marker } = await import("@starbeam/reactive");
  type Marker = import("@starbeam/reactive").Marker;
  await import("@starbeam/runtime");

  abstract class TestManager<Definition extends object, Instance extends object> implements ResourceManager<Definition, Instance> {
    create: (definition: Definition, run: ResourceRun) => Instance;
    update: (definition: Definition, prev: Instance, next: ResourceRun) => Instance;
    
  }

  describe("ResourceManager", () => {
    describe("using a simple manager", () => {
      class SimpleTestManager<T extends object>
        implements ResourceManager<() => T, T>
      {
        create(definition: () => T): T {
          return definition();
        }

        update(definition: () => T) {
          return definition();
        }
      }

      it("can be instantiated", () => {
        function Counter() {
          const cell = Cell(0);

          return {
            get count() {
              return cell.current;
            },

            increment: () => {
              cell.update((prev) => prev + 1);
            },
          };
        }

        const counter = useResourceManager(
          Counter,
          new SimpleTestManager(),
          {}
        );

        expect(counter.current.count).toBe(0);

        counter.current.increment();
        expect(counter.current.count).toBe(1);
      });

      it("invalidates when the definition changes", () => {
        function Counter(marker: Marker) {
          marker.read();
          const cell = Cell(0);

          return {
            get count() {
              return cell.current;
            },

            increment: () => {
              cell.update((prev) => prev + 1);
            },
          };
        }

        const invalidate = Marker();
        const counter = useResourceManager(
          () => Counter(invalidate),
          new SimpleTestManager(),
          {}
        );

        expect(counter.current.count).toBe(0);

        counter.current.increment();
        expect(counter.current.count).toBe(1);

        invalidate.mark();
        expect(counter.current.count).toBe(0);
      });

      it("doesn't require double .current", () => {
        function Counter(marker: Marker) {
          marker.read();
          const cell = Cell(0);

          return Formula(() => ({
            count: cell.current,
            increment: () => {
              cell.update((prev) => prev + 1);
            },
          }));
        }

        const invalidate = Marker();
        const counter = useResourceManager(
          () => Counter(invalidate),
          new SimpleTestManager(),
          {}
        );

        expect(counter.current.count).toBe(0);
        counter.current.increment();
        expect(counter.current.count).toBe(1);
        counter.current.increment();
        expect(counter.current.count).toBe(2);

        invalidate.mark();
        expect(counter.current.count).toBe(0);
      });
    });
  });

  describe("a manager that supports destruction", () => {
    class DestroyableTestManager<T extends object>
      implements ResourceManager<() => T, T>
    {
      create(definition: () => T, run: ResourceRun): T {
        const instance = definition();
        RUNTIME.link(run, instance);
        return instance;
      }

      update(definition: () => T, prev: T, run: ResourceRun) {
        return this.create(definition, run);
      }
    }

    it("invalidates the instance when the definition changes", () => {
      const actions = new Actions();
      let id = 0;

      function Counter(marker: Marker) {
        marker.read();
        const cell = Cell(0);
        id++;

        const instance = {
          get count() {
            return cell.current;
          },

          increment: () => {
            cell.update((prev) => prev + 1);
          },
        };

        RUNTIME.onFinalize(instance, () => {
          actions.record(`destroyed ${id}`);
        });

        return instance;
      }

      const invalidate = Marker();
      const lifetime = {};
      const counter = useResourceManager(
        () => Counter(invalidate),
        new DestroyableTestManager(),
        lifetime
      );

      expect(counter.current.count).toBe(0);
      counter.current.increment();
      expect(counter.current.count).toBe(1);

      invalidate.mark();
      expect(counter.current.count).toBe(0);
      actions.expect("destroyed 1");

      counter.current.increment();
      expect(counter.current.count).toBe(1);

      RUNTIME.finalize(lifetime);
      actions.expect("destroyed 2");

      expect(counter.current.count).toBe(1);
      RUNTIME.finalize(lifetime);
      actions.expect();

      invalidate.mark();
      expect(counter.current.count).toBe(1);
      actions.expect();
    });
  });

  describe("nested resources", () => {
    class NestableTestManager<T extends object>
      implements ResourceManager<() => T, T>
    {
      create(definition: () => T, run: ResourceRun): T {
        const instance = definition();
        RUNTIME.link(run, instance);
        return instance;
      }

      update(definition: () => T, prev: T, run: ResourceRun) {
        return this.create(definition, run);
      }
    }
  });
}

class Actions {
  #actions: string[] = [];

  record(action: string) {
    this.#actions.push(action);
  }

  expect(...expected: string[]) {
    const actual = this.#actions;
    this.#actions = [];

    expect(actual, "recorded actions").toEqual(expected);
  }
}
