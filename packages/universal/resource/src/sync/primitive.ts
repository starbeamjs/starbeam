import { CachedFormula, type FormulaFn } from "@starbeam/reactive";
import {
  createPushScope,
  type FinalizationScope,
  link,
  pushingScope,
} from "@starbeam/runtime";
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
export type Sync<T> = {
  setup: () => SyncResult<T>;
};

/** @internal */
export type SyncResult<T> = {
  sync: SyncFn<void>;
  value: T;
};

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
        (scope) => {
          let last: FinalizationScope | null = null;

          const { sync, finalize: finalizeFn, value } = define();

          if (finalizeFn) {
            onFinalize(scope, finalizeFn);
          }

          const formula = CachedFormula(() => {
            if (isFinalized(scope)) return;
            if (last) {
              finalize(last);
            }

            const done = mountFinalizationScope(scope);
            const doneRun = pushFinalizationScope();
            const cleanupScope = createPushScope();
            const cleanup = sync();
            if (cleanup) {
              onFinalize(cleanupScope, cleanup);
            }

            last = doneRun();

            done();
          });

          link(formula, scope);
          return { sync: formula, value } as SyncResult<T>;
        },
        { childScope: scope },
      );
    },
  };
}
