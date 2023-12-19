import type { FormulaFn } from "@starbeam/reactive";
import { CachedFormula } from "@starbeam/reactive";
import type { FinalizationScope } from "@starbeam/runtime";
import { createPushScope, link, pushingScope } from "@starbeam/runtime";
import {
  finalize,
  isFinalized,
  mountFinalizationScope,
  onFinalize,
  pushFinalizationScope,
} from "@starbeam/shared";

export type Cleanup = () => void;
export type SyncHandler = () => void | Cleanup;

export interface SyncOptions {
  label?: string | undefined;
}

export type SyncFn<T> = FormulaFn<T>;
export interface Sync<T> {
  readonly setup: () => SyncResult<T>;
}

/** @internal */
export interface SyncResult<T> {
  readonly sync: SyncFn<void>;
  readonly value: T;
}

export function PrimitiveSyncTo<T = undefined>(
  define: () =>
    | {
        sync: SyncHandler;
        finalize?: Cleanup | undefined;
        value: T;
      }
    | {
        sync: SyncHandler;
        finalize?: Cleanup | undefined;
        value?: undefined;
      },
  options?: SyncOptions,
): Sync<T> {
  return {
    setup: () => {
      const label = options?.label;
      const scope = label ? { label } : createPushScope();

      return pushingScope(
        (syncScope) => {
          let last: FinalizationScope | null = null;

          const { sync, finalize: finalizeFn, value } = define();

          if (finalizeFn) {
            onFinalize(finalizeFn);
          }

          // This formula is polled inside of the sync phase.
          const syncPhaseFormula = CachedFormula(() => {
            if (isFinalized(syncScope)) return;
            if (last) finalize(last);

            const done = mountFinalizationScope(syncScope);

            try {
              const done = pushFinalizationScope();

              try {
                const cleanup = sync();
                if (cleanup) onFinalize(cleanup);
              } finally {
                last = done();
              }
            } finally {
              done();
            }
          });

          link(syncPhaseFormula, syncScope);
          return { sync: syncPhaseFormula, value } as SyncResult<T>;
        },
        { childScope: scope },
      );
    },
  };
}
