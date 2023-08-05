import { createPushScope, link } from "@starbeam/runtime";
import { isPresent, verify } from "@starbeam/verify";

import {
  type Cleanup,
  PrimitiveSyncTo,
  type SyncFn,
  type SyncHandler,
} from "./primitive.js";

export type SyncConstructor = (define: DefineSync) => void;

class DefineSync {
  static define = (constructor: SyncConstructor): (() => SyncFn) => {
    const scope = createPushScope();

    return PrimitiveSyncTo(() => {
      const defineSync = new DefineSync();
      constructor(defineSync);
      link(scope, defineSync);

      verify(defineSync.#sync, isPresent);

      return {
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

  use<const Child extends (...args: unknown[]) => void>(child: Child, ...args: Parameters<Child>): void {
    
    
  }
}

export const SyncTo = DefineSync.define;
