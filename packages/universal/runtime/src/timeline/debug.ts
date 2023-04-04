import type * as interfaces from "@starbeam/interfaces";
export class DebugRuntime implements interfaces.DebugRuntime {
  untrackedReadBarrier(
    _barrier: (tag: interfaces.Tag, stack: interfaces.Stack) => void | never
  ): void {
    /* ... */
  }
}

export const DEBUG_RUNTIME = new DebugRuntime();
