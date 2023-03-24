import type { CellTag, Stack, Tagged } from "@starbeam/interfaces";

export interface ReactiveRuntime {
  didConsumeCell: (cell: Tagged<CellTag>, caller?: Stack) => void;
  callerStack: () => Stack;
}

export const CONTEXT = {
  runtime: null as null | ReactiveRuntime,
};

export function defineRuntime(runtime: ReactiveRuntime): void {
  CONTEXT.runtime = runtime;
}

export function getRuntime(): ReactiveRuntime {
  if (import.meta.env.DEV) {
    if (CONTEXT.runtime === null) {
      throw Error(
        "@starbeam/reactive requires a reactive runtime, but no runtime was registered (did you try to use @starbeam/reactive without @starbeam/universal?)"
      );
    }
  }

  return CONTEXT.runtime as ReactiveRuntime;
}
