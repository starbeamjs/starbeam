import { linkToFinalizationScope } from "@starbeam/shared";

import {
  type Cleanup,
  PrimitiveSyncTo,
  type Sync,
  type SyncHandler,
} from "./primitive.js";

export type SyncConstructor<T> = (define: DefineSync) => T;

export class DefineSync {
  static define = <T>(constructor: SyncConstructor<T>): Sync<T> => {
    return PrimitiveSyncTo(() => {
      const defineSync = new DefineSync();
      const value = constructor(defineSync);
      linkToFinalizationScope(defineSync);

      return {
        value,
        sync: defineSync.#sync ?? (() => void 0),
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
    sync: (handler: SyncHandler) => {
      this.#sync = handler;
    },

    finalize: (handler: SyncHandler) => {
      this.#finalize = handler;
    },
  };
}

export const SyncTo = DefineSync.define;
