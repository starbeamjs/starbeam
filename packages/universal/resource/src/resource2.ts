import type { Reactive } from "@starbeam/interfaces";
import { CachedFormula, Cell } from "@starbeam/reactive";
import { createScope, link, scoped } from "@starbeam/runtime";
import {
  finalize,
  linkToFinalizationScope,
  onFinalize,
} from "@starbeam/shared";

type FinalizationScope = object;

export function Resource2<T>(constructor: (run: ResourceRun) => T) {
  function construct() {
    const lastRun = new ResourceRun();
    linkToFinalizationScope(lastRun);

    const instance = constructor(lastRun);
    const isSetupCell = Cell(false);

    return {
      instance,
      run: lastRun,
      get isSetup() {
        return isSetupCell.current;
      },
      setup: () => {
        isSetupCell.set(true);
      },
      cleanup: () => {
        isSetupCell.set(false);
      },
    };
  }

  function instantiate() {
    let lastScope: FinalizationScope | undefined;
    const parent = createScope();
    const instance = construct();

    const setup = CachedFormula(() => {
      if (!instance.isSetup) return;
      if (lastScope && !finalize(lastScope)) return;

      [lastScope] = scoped(() => {
        ResourceRun.setup(instance.run);
      });

      link(parent, lastScope);

      onFinalize(lastScope, () => {
        ResourceRun.cleanup(instance.run);
      });
    });

    const value = CachedFormula(() => {
      if (instance.isSetup) setup();
      return instance.instance;
    });

    SETUPS.set(value, instance.setup);

    return value;
  }

  return instantiate;
}

const SETUPS = new WeakMap<object, () => void>();

export function setupResource<T>(resource: Reactive<T>) {
  const setupFn = SETUPS.get(resource);
  if (setupFn) setupFn();
}

interface ResourceState<T> {
  instance: T;
  setup: () => void;
}

type ResourceBlueprint<T> = () => ResourceState<T>;

class ResourceRun {
  static setup(run: ResourceRun) {
    run.#setup();
  }

  static cleanup(run: ResourceRun) {
    run.#cleanup();
  }

  #onSetup: undefined | (() => void | (() => void));
  readonly #onCleanup = new Set<() => void>();

  readonly on = {
    setup: (handler: () => () => void) => {
      this.#onSetup = handler;
    },
  };

  #cleanup() {
    for (const handler of this.#onCleanup) {
      handler();
    }
    this.#onCleanup.clear();
  }

  #setup() {
    if (this.#onSetup) {
      const cleanup = this.#onSetup();
      if (cleanup) this.#onCleanup.add(cleanup);
    }
  }
}

type Resource<T> = Reactive<T>;
