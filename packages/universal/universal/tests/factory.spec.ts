import { entryPointFn } from "@starbeam/debug";
import { Frame, ReactiveProtocol } from "@starbeam/timeline";
import { Cell, Formula, Reactive, Static } from "@starbeam/universal";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

describe("reactive Factory", () => {
  describe.each([0, 1, 0n, "hello", "", true, false, null, undefined])(
    "representing a primitive value: %s",
    (value) => {
      test(`Reactive(() => ${s(
        value
      )}) returns a reactive that returns the same value`, () => {
        const reactive = Reactive(() => value);
        expect(reactive.create()).toBe(value);
      });

      test(`Reactive(() => Static(${s(
        value
      )})) returns a reactive that returns the same value`, () => {
        const reactive = Reactive(() => Static(value));
        expect(reactive.create().current).toBe(value);
      });

      test(`Reactive(() => Reactive(() => ${s(value)})))`, () => {
        const reactive = Reactive(() => Reactive(() => value));
        expect(reactive.create()).toBe(value);
      });
    }
  );

  describe("returning a single mutable cell", () => {
    let i = 0;
    const Counter = Reactive(() => Cell(0, { description: `Counter ${i++}` }));

    test("the inner cell is returned", () => {
      const counter = Counter.create();

      expect(ReactiveProtocol.description(counter).describe()).toBe(
        "Counter 0"
      );

      expect(counter.current).toBe(0);
      counter.update((value) => value + 1);
      expect(counter.current).toBe(1);
    });

    test("the returned value invalidates when the cell changes", () => {
      const counter = Counter.create();

      const context = TrackingContext(() => counter.current);

      expectStale(context, 0);
      counter.update((value) => value + 1);
      expectStale(context, 1);
    });
  });

  describe("an abstraction over mutable cells", () => {
    const Counter = Reactive(() => {
      const cell = Cell(0);
      const extra = Cell(0);

      return {
        get count() {
          return cell.current;
        },
        get extra() {
          return extra.current;
        },
        increment() {
          cell.update((value) => value + 1);
        },
        incrementExtra() {
          extra.update((value) => value + 1);
        },
      };
    });

    test("the cell is created", () => {
      const counter = Counter.create();
      expect(counter.count).toBe(0);
      counter.increment();
      expect(counter.count).toBe(1);
    });

    test("the reactive object *granularly* invalidates when its dependencies change", () => {
      const counter = Counter.create();
      const countContext = TrackingContext(() => counter.count);
      const extraContext = TrackingContext(() => counter.extra);

      expectStale(countContext, 0);
      expectStale(extraContext, 0);

      counter.increment();

      expectStale(countContext, 1);
      expectValid(extraContext, 0);

      counter.incrementExtra();

      expectValid(countContext, 1);
      expectStale(extraContext, 1);

      expectValid(countContext, 1);
      expectValid(extraContext, 1);

      counter.increment();
      counter.incrementExtra();

      expectStale(countContext, 2);
      expectStale(extraContext, 2);
    });
  });

  describe("a class", () => {
    class Counter {
      #cell = Cell(0);
      #extra = Cell(0);

      get count() {
        return this.#cell.current;
      }

      get extra() {
        return this.#extra.current;
      }

      increment() {
        this.#cell.update((value) => value + 1);
      }

      incrementExtra() {
        this.#extra.update((value) => value + 1);
      }
    }

    test("the cell is created", () => {
      const counter = Reactive(Counter).create();
      expect(counter.count).toBe(0);
      counter.increment();
      expect(counter.count).toBe(1);
    });

    test("the reactive object *granularly* invalidates when its dependencies change", () => {
      const counter = Reactive(Counter).create();
      const countContext = TrackingContext(() => counter.count);
      const extraContext = TrackingContext(() => counter.extra);

      expectStale(countContext, 0);
      expectStale(extraContext, 0);

      counter.increment();

      expectStale(countContext, 1);
      expectValid(extraContext, 0);

      counter.incrementExtra();

      expectValid(countContext, 1);
      expectStale(extraContext, 1);

      expectValid(countContext, 1);
      expectValid(extraContext, 1);

      counter.increment();
      counter.incrementExtra();

      expectStale(countContext, 2);
      expectStale(extraContext, 2);
    });
  });
});

type Primitive = number | bigint | string | boolean | null | undefined | symbol;

function s(value: Primitive): string {
  switch (typeof value) {
    case "bigint":
      return `${value}n`;
    case "symbol":
      return `Symbol(${value.description})`;
    default:
      return JSON.stringify(value);
  }
}

type Validation<T> =
  | { status: "valid"; value: T }
  | { status: "stale"; value: T };

function valid<T>(value: T): Validation<T> {
  return { status: "valid", value };
}

function stale<T>(value: T): Validation<T> {
  return { status: "stale", value };
}

const expectStale = entryPointFn(<T>(context: Context<T>, value: T) => {
  expect(context.value).toEqual(stale(value));
  expect(context.value, "the value after validating").toEqual(valid(value));
});

const expectValid = entryPointFn(<T>(context: Context<T>, value: T) => {
  expect(context.value).toEqual(valid(value));
});

interface Context<T> {
  readonly value: Validation<T>;
}

function TrackingContext<T>(callback: () => T): Context<T> {
  const formula = Formula(callback);

  return {
    get value(): Validation<T> {
      const status = formula.frame.validate();

      if (status.status === "valid") {
        return status;
      } else {
        return {
          status: "stale",
          value: Frame.value(formula.poll()),
        };
      }
    },
  };
}
