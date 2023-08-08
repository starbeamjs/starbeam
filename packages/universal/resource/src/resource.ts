import { CachedFormula } from "@starbeam/reactive";

import { type DefineSync, SyncTo } from "./sync/high-level.js";
import type { SyncFn, SyncResult } from "./sync/primitive.js";

export function Resource<const T>(
  setup: SetupResource<T>,
): ResourceBlueprint<T> {
  const setupSync = SyncTo((define) => {
    const defineResource = new DefineResource(define);

    const result = setup(defineResource);

    return result;
  });

  return () => {
    return setupSync.setup();
  };
}

export type SetupResource<T> = (define: DefineResource) => T;

export type ResourceBlueprint<T> = () => SyncResult<T>;

export class DefineResource {
  static getSync(resource: DefineResource) {
    return resource.#define;
  }

  readonly on;
  readonly #define: DefineSync;

  constructor(define: DefineSync) {
    this.on = define.on;
    this.#define = define;
  }

  use = <U>(resource: ResourceBlueprint<U>): SyncFn<U> => {
    const { sync, value } = resource();

    // this.#define.on.sync(sync);

    return CachedFormula(() => {
      sync();
      return value;
    });
  };
}
