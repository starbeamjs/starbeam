import { isPresent } from "@starbeam/core-utils";
import { CachedFormula, Cell, Marker } from "@starbeam/reactive";
import { createScope, link, scoped } from "@starbeam/runtime";
import { finalize, onFinalize } from "@starbeam/shared";
import { verified } from "@starbeam/verify";
import { Actions, entryPoint } from "@starbeam-workspace/test-utils";
import { describe, expect, test } from "vitest";

type FinalizationScope = object;

const INITIAL_DATE = new Date("2022-01-01");

describe("a manual resource", () => {
  test("a single resource", () => {
    const actions = new Actions();

    function construct() {
      actions.record("construct");

      const cell = Cell(INITIAL_DATE);
      let isSetup = false;
      let isCleanedUp = false;

      return {
        setup: () => {
          actions.record("setup");
          isSetup = true;
        },

        cleanup: () => {
          if (isCleanedUp) return;
          actions.record("cleanup");
          isCleanedUp = true;
        },

        tick: () => {
          if (isSetup && !isCleanedUp) {
            cell.update((date) => ticked(date));
          }
        },

        get now() {
          return cell.current;
        },
      };
    }

    const instance = construct();
    const subject = new Subject(
      instance,
      (instance) => instance.now,
      actions
    ).actions("construct");

    subject.expect(
      {
        actions: [],
        value: INITIAL_DATE,
      },
      "initial state"
    );

    subject.do((instance) => void instance.tick(), {
      value: INITIAL_DATE,
      actions: [],
    });

    subject.do((instance) => void instance.tick(), {
      value: INITIAL_DATE,
      actions: [],
    });

    subject.do((instance) => void instance.setup(), {
      value: INITIAL_DATE,
      actions: ["setup"],
    });

    subject.do((instance) => void instance.tick(), {
      value: ticked(INITIAL_DATE),
      actions: [],
    });

    subject.do((instance) => void instance.cleanup(), {
      value: ticked(INITIAL_DATE),
      actions: ["cleanup"],
    });

    subject.do((instance) => void instance.tick(), {
      value: ticked(INITIAL_DATE),
      actions: [],
    });

    subject.do((instance) => void instance.cleanup(), {
      value: ticked(INITIAL_DATE),
      actions: [],
    });
  });

  test("re-evaluating setup", () => {
    const actions = new Actions();
    const invalidate = Marker();

    function construct() {
      actions.record("construct");

      const cell = Cell(INITIAL_DATE);
      let isSetup = false;

      return {
        setup: (run: FinalizationScope) => {
          invalidate.read();
          actions.record("setup");
          isSetup = true;

          onFinalize(run, () => {
            if (isSetup === false) return;
            isSetup = false;
            actions.record("cleanup");
          });
        },

        tick: () => {
          if (isSetup) {
            cell.update((date) => ticked(date));
          }
        },

        get now() {
          return cell.current;
        },
      };
    }

    const parent = createScope();

    const instance = construct();

    const setup = CachedFormula(() => {
      if (lastScope) finalize(lastScope);

      const run = {};
      [lastScope] = scoped(() => void instance.setup(run));

      link(lastScope, run);
      link(parent, lastScope);
    });

    const subject = new Subject(
      { instance, setup },
      ({ instance }) => instance.now,
      actions
    );
    subject.actions("construct");

    let lastScope: FinalizationScope | undefined;

    subject.expect({
      actions: [],
      value: INITIAL_DATE,
    });

    subject.do(
      ({ setup, instance }) => {
        setup();
        instance.tick();
      },
      {
        value: ticked(INITIAL_DATE),
        actions: ["setup"],
      }
    );

    subject.do(({ setup }) => void setup(), {
      value: ticked(INITIAL_DATE),
      actions: [],
    });

    invalidate.mark();

    subject.do(({ setup }) => void setup(), {
      value: ticked(INITIAL_DATE),
      actions: ["cleanup", "setup"],
    });

    subject.do(
      ({ setup, instance }) => {
        setup();
        instance.tick();
      },
      {
        value: ticked(ticked(INITIAL_DATE)),
        actions: [],
      }
    );
  });

  test("tucking setup into the formula", () => {
    const actions = new Actions();
    const invalidate = Marker();

    function construct() {
      actions.record("construct");

      const cell = Cell(INITIAL_DATE);
      let isSetup = false;

      return {
        setup: (run: FinalizationScope) => {
          invalidate.read();
          actions.record("setup");
          isSetup = true;

          onFinalize(run, () => {
            if (isSetup === false) return;
            isSetup = false;
            actions.record("cleanup");
          });
        },

        tick: () => {
          if (isSetup) {
            cell.update((date) => ticked(date));
          }
        },

        get now() {
          return cell.current;
        },
      };
    }

    let lastScope: FinalizationScope | undefined;

    const parent = createScope();

    const instance = construct();

    const setup = CachedFormula(() => {
      if (lastScope && !finalize(lastScope)) return;

      const run = {};
      [lastScope] = scoped(() => void instance.setup(run));

      link(lastScope, run);
      link(parent, lastScope);
    });

    const value = CachedFormula(() => {
      setup();
      return instance;
    });

    const subject = new Subject(value, (value) => value.current.now, actions);

    subject.actions("construct");

    subject.expect({
      actions: ["setup"],
      value: INITIAL_DATE,
    });

    subject.expect({
      actions: [],
      value: INITIAL_DATE,
    });

    invalidate.mark();

    subject.expect({
      actions: ["cleanup", "setup"],
      value: INITIAL_DATE,
    });

    subject.do((instance) => void instance().tick(), {
      value: ticked,
      actions: [],
    });

    subject.do((instance) => void instance().tick(), {
      value: ticked,
      actions: [],
    });

    subject.do(() => finalize(parent), {
      actions: ["cleanup"],
      value: unchanged,
    });

    subject.do(() => void invalidate.mark(), {
      actions: [],
      value: unchanged,
    });

    subject.do(() => finalize(parent), {
      actions: [],
      value: unchanged,
    });

    // subject.do(
    //   ({ setup, instance }) => {
    //     setup();
    //     instance.tick();
    //   },
    //   {
    //     value: tick(tick(INITIAL_DATE)),
    //     actions: [],
    //   }
    // );
  });
});

interface Tickable {
  tick: () => void;
  readonly now: Date;
}

function tick(instance: Tickable) {
  instance.tick();
}

function unchanged<T>(value: T): T {
  return value;
}

interface PostAssertion<U> {
  value: U | ((prev: U) => U);
  actions: string[];
}

class Subject<T, U> {
  #value: T;
  #prev: U | undefined;
  #actions: Actions;
  #extract: (value: T) => U;

  constructor(value: T, extract: (value: T) => U, actions: Actions) {
    this.#value = value;
    this.#extract = extract;
    this.#actions = actions;
  }

  do(
    block: (instance: T) => void,
    assertions: PostAssertion<U>,
    message?: string
  ): this {
    entryPoint(
      () => {
        block(this.#value);
        this.expect(assertions, message);
      },
      { entryFn: this.do }
    );
    return this;
  }

  expect(assertion: PostAssertion<U>, message?: string): this {
    entryPoint(
      () => {
        const nextValue = this.#extract(this.#value);

        const providedValue = assertion.value;
        const expectedValue =
          typeof providedValue === "function"
            ? (providedValue as (prev: U) => U)(verified(this.#prev, isPresent))
            : providedValue;
        this.#prev = expectedValue;

        expect(nextValue, message).toStrictEqual(expectedValue);
        this.#actions.expectActions(assertion.actions, message);
      },
      { entryFn: this.expect }
    );
    return this;
  }

  actions(...actions: string[] | [[]]): this {
    entryPoint(
      () => {
        this.#actions.expect(...actions);
      },
      { entryFn: this.actions }
    );

    return this;
  }
}

function ticked(date: Date): Date {
  const update = new Date(date);
  update.setSeconds(update.getSeconds() + 1);
  return update;
}

test("unit: tick increments a date", () => {
  const date = INITIAL_DATE;
  const tickedDate = ticked(date);

  expect(tickedDate.getSeconds()).toBe(INITIAL_DATE.getSeconds() + 1);
});
