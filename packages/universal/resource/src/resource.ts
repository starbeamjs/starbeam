import type { Description } from "@starbeam/interfaces";
import { CachedFormula } from "@starbeam/reactive";
import {
  linkToFinalizationScope,
  mountFinalizationScope,
} from "@starbeam/shared";

import type { DefineSync } from "./sync/high-level.js";
import { SyncTo } from "./sync/high-level.js";
import type { Sync, SyncFn, SyncResult } from "./sync/primitive.js";

export type SetupResource<T> = (define: DefineResource) => T;

export type ResourceConstructor<T> = () => ResourceBlueprint<T>;

export type ResourceBlueprint<T> = Sync<T>;
export type IntoResourceBlueprint<T> =
  | ResourceBlueprint<T>
  | ResourceConstructor<T>;

export class DefineResource {
  static define = <T>(
    constructor: SetupResource<T>,
    _description?: Description | string,
  ): ResourceBlueprint<T> => {
    const setupSync = SyncTo((define) => {
      const defineResource = new DefineResource(define);
      const value = constructor(defineResource);
      linkToFinalizationScope(defineResource);

      return {
        value,
        syncChildren: () => {
          for (const child of defineResource.#children) {
            child();
          }
        },
      };
    });

    return {
      setup: () => {
        const {
          sync,
          value: { value, syncChildren },
        } = setupSync.setup();

        return {
          value,
          sync: CachedFormula(() => {
            sync();
            syncChildren();
          }),
        };
      },
    };
  };

  readonly #children = new Set<SyncFn<unknown>>();
  readonly on;

  constructor(define: DefineSync) {
    this.on = define.on;
  }

  readonly use = <T>(blueprint: ResourceBlueprint<T>): T => {
    const done = mountFinalizationScope(this);
    const { sync, value } = blueprint.setup();

    this.#children.add(sync);

    done();

    return value;
  };
}

export function use<T>(intoBlueprint: IntoResourceBlueprint<T>): Resource<T> {
  const blueprint =
    typeof intoBlueprint === "function" ? intoBlueprint() : intoBlueprint;

  return blueprint.setup();
}

export const Resource = DefineResource.define;
export type Resource<T> = SyncResult<T>;
