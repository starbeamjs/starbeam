import type { CellTag } from "../tag.js";
import type { Tagged } from "../tagged.js";
import type { CallerStackFn, CallStack } from "./call-stack.js";
import type { DescFn, DescriptionDetails } from "./description.js";

export type DescribeOptions =
  | {
      id: boolean | undefined;
    }
  | undefined;

export interface DebugRuntime {
  getUserFacing: <D extends DescriptionDetails | undefined>(
    description: D
  ) => D;
  describe: (
    description: DescriptionDetails,
    options?: DescribeOptions
  ) => string;
  describeTagged: (tagged: Tagged, options?: DescribeOptions) => string;
  readonly untrackedReadBarrier: (
    barrier: (tag: CellTag, stack: CallStack | undefined) => void | never
  ) => void;
  readonly callerStack: CallerStackFn;

  readonly Desc: DescFn;
}
