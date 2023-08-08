import { createPushScope, link } from "@starbeam/runtime";
import { isPresent, verify } from "@starbeam/verify";

import {
  type Cleanup,
  PrimitiveSyncTo,
  type Sync,
  type SyncHandler,
} from "./primitive.js";

export type SyncConstructor<T> = (define: DefineSync) => T;

export class DefineSync {
  static define = <T>(constructor: SyncConstructor<T>): Sync<T> => {
    const scope = createPushScope();

    return PrimitiveSyncTo(() => {
      const defineSync = new DefineSync();
      const value = constructor(defineSync);
      link(scope, defineSync);

      verify(defineSync.#sync, isPresent);

      return {
        value,
        sync: defineSync.#sync,
        finalize: defineSync.#finalize,
      };
    });
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
