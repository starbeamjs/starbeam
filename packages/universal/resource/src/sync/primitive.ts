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

export type SyncFn = FormulaFn<void>;

export function PrimitiveSyncTo(
  define: () => {
    sync: SyncHandler;
    finalize?: Cleanup | undefined;
  },
  options?: SyncOptions,
): () => SyncFn {
  return () => {
    const label = options?.label;
    const scope = label ? { label } : createPushScope();

    return pushingScope(
      (scope) => {
        let last: FinalizationScope | null = null;

        const { sync, finalize: finalizeFn } = define();

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
        return formula;
      },
      { childScope: scope },
    );
  };
}
