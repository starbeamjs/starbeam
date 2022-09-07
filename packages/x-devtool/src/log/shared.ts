import type { DebugFilter } from "@starbeam/debug";
import type { StackFrameDisplayOptions } from "@starbeam/interfaces";

export type DevtoolsLineOptions = StackFrameDisplayOptions;

export interface DevtoolsOptions extends DevtoolsLineOptions {
  filter?: DebugFilter;
  internals?: boolean;
}
