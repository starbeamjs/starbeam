import { linkToFinalizationScope } from "@starbeam/shared";

import type { Cleanup, Sync, SyncHandler } from "./primitive.js";
import { PrimitiveSyncTo } from "./primitive.js";

export interface SyncHooks {
  readonly sync: (handler: SyncHandler) => void;
  readonly lowLevel: {
    readonly finalize: (handler: Cleanup) => void;
  };
}

export interface DefineSyncContext {
  readonly on: SyncHooks;
}

export type SyncConstructor<T> = (define: DefineSyncContext) => T;

const INITIAL = 0;

export class DefineSync {
  static define = <T>(constructor: SyncConstructor<T>): Sync<T> => {
    return PrimitiveSyncTo(() => {
      const defineSync = new DefineSync();
      const value = constructor(defineSync);
      linkToFinalizationScope(defineSync);

      return {
        value,
        sync: defineSync.#sync ?? (() => void INITIAL),
        finalize: defineSync.#finalize,
      };
    });
  };

  static getSync = (define: DefineSync): SyncHandler | undefined => {
    return define.#sync;
  };

  #sync: SyncHandler | undefined;
  #finalize: Cleanup | undefined;

  readonly on = {
    sync: (handler: SyncHandler): void => {
      this.#sync = handler;
    },

    lowLevel: {
      finalize: (handler: Cleanup): void => {
        this.#finalize = handler;
      },
    },

    // Keep this compatibility alias out of the normal authoring API docs.
    /** @deprecated Compatibility alias. Use `on.lowLevel.finalize()` instead. */
    finalize: (handler: Cleanup): void => {
      this.#finalize = handler;
    },
  };
}

export const SyncTo = DefineSync.define;
