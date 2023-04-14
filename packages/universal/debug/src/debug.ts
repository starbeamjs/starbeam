import type { DebugRuntime } from "@starbeam/interfaces";

import callerStack from "./call-stack/debug/index.js";
import {
  describe,
  describeTagged,
  getUserFacing,
} from "./description/debug/describe.js";
import desc from "./description/debug/index.js";

const untrackedReadBarrier = (() => {
  /* FIXME: do nothing for now */
}) satisfies DebugRuntime["untrackedReadBarrier"];

export default {
  desc,
  callerStack,
  getUserFacing,
  untrackedReadBarrier,
  describe,
  describeTagged,
} satisfies DebugRuntime;
