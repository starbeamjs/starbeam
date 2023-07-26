import { CachedFormula, type FormulaFn } from "@starbeam/reactive";
import type { FinalizationScope } from "@starbeam/runtime";
import {
  finalize,
  mountFinalizationScope,
  onFinalize,
  pushFinalizationScope,
} from "@starbeam/shared";

export function Sync(callback: () => () => void): InactiveSync {
  return (scope) => {
    let last: object | undefined;

    return CachedFormula(() => {
      if (last) finalize(last);

      const doneScope = mountFinalizationScope(scope);
      const done = pushFinalizationScope();
      const cleanup = callback();
      onFinalize(cleanup);
      last = done();

      doneScope();
    });
  };
}

export type Sync = FormulaFn<void>;
export type InactiveSync = (scope: FinalizationScope) => Sync;
