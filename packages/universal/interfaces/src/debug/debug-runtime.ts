import type { CellTag } from "../tag.js";
import type { Tagged } from "../tagged.js";
import type { CallerStackFn, CallStack } from "./call-stack.js";
import type { DescFn, DescriptionDetails } from "./description.js";

export interface DebugRuntime {
  getUserFacing: <D extends DescriptionDetails | undefined>(
    description: D
  ) => D;
  describe: (
    description: DescriptionDetails,
    options?: { id: boolean | undefined } | undefined
  ) => string;
  describeTagged: (
    tagged: Tagged,
    options?: { id: boolean | undefined } | undefined
  ) => string;
  readonly untrackedReadBarrier: (
    barrier: (tag: CellTag, stack: CallStack | undefined) => void | never
  ) => void;
  readonly callerStack: CallerStackFn;

  readonly desc: DescFn;
}
