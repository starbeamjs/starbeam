// import type { ResourceBlueprint } from "../formula/resource.js";

import type { Unsubscribe } from "@starbeam/interfaces";
import { LIFETIME, Reactive } from "@starbeam/timeline";
import { FormulaFn } from "../formula/formula.js";
import { ResourceBlueprintBrand, type ResourceBlueprint } from "./brands.js";

type ResourceReturn<T> =
  | Reactive<T>
  | ResourceBlueprint<T>
  | ResourceConstructor<T>;

type SetupHandler = () => void | (() => void);

export function ResourceFn<T>(
  constructor: ResourceConstructor<T>
): ResourceBlueprint<T> {
  return ResourceBlueprintBrand.brand({
    create(owner: object): Reactive<T> {
      const run = {
        current: new ResourceRun(),
      };

      const formula = FormulaFn(() => {
        const prevRun = run.current;

        if (prevRun) {
          LIFETIME.finalize(prevRun);
        }

        const currentRun = (run.current = run.current.next());
        LIFETIME.link(owner, currentRun);

        const ret = constructor({
          use: (blueprint) => {
            if (typeof blueprint === "function") {
              return ResourceFn(blueprint).create(currentRun);
            } else {
              return blueprint.create(currentRun);
            }
          },

          on: {
            cleanup: (handler: Unsubscribe) => {
              LIFETIME.on.cleanup(currentRun, handler);
            },

            setup: (handler: SetupHandler) => {
              currentRun.push(handler);
            },
          },
        });

        if (ResourceBlueprintBrand.has<T>(ret)) {
          return ret.create(owner);
        } else if (Reactive.is(ret)) {
          return ret;
        } else {
          return ResourceFn(ret).create(owner);
        }
      });

      const resource = FormulaFn(() => {
        run.current.poll();
        return formula.read().read();
      });
      RUNS.set(resource, run);
      return resource;
    },
  });
}

class ResourceRun {
  #isSetup = false;
  readonly #setups: SetupHandler[] = [];
  readonly #poll: FormulaFn<void>[] = [];

  poll() {
    this.#poll.forEach((formula) => formula.read());
  }

  next() {
    LIFETIME.finalize(this);
    return new ResourceRun();
  }

  push(setup: SetupHandler) {
    if (this.#isSetup) {
      runSetup(this, setup);
    } else {
      this.#setups.push(setup);
    }
  }

  setup() {
    if (this.#isSetup) {
      return;
    }

    this.#isSetup = true;

    const formulas = this.#setups.map((setup) => this.#createSetup(setup));
    formulas.forEach((formula) => formula.read());

    this.#poll.push(...formulas);
  }

  #createSetup(setup: SetupHandler): FormulaFn<void> {
    return FormulaFn(() => {
      const unsubscribe = setup();

      if (unsubscribe) {
        LIFETIME.on.cleanup(this, unsubscribe);
      }
    });
  }
}

const RUNS = new WeakMap<Reactive<unknown>, { current: ResourceRun }>();

ResourceFn.setup = function <T>(resource: Reactive<T>): void {
  const run = RUNS.get(resource);

  if (run) {
    run.current.setup();
  }
};

function runSetup(current: object, setup: SetupHandler): void {
  const cleanup = setup();
  if (cleanup) {
    LIFETIME.on.cleanup(current, cleanup);
  }
}

export type ResourceConstructor<T> = (
  resource: ResourceBuilder
) => ResourceReturn<T>;

interface ResourceBuilder {
  readonly use: <T>(
    this: void,
    resource: ResourceBlueprint<T> | ResourceConstructor<T>
  ) => Reactive<T>;

  readonly on: {
    readonly cleanup: (this: void, handler: Unsubscribe) => void;
    readonly setup: (this: void, handler: SetupHandler) => void;
  };
}
