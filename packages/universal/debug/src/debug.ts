import type { DebugRuntime } from "@starbeam/interfaces";

import callerStack from "./call-stack/debug/index.js";
import { getEntryPoint, markEntryPoint } from "./call-stack/entry.js";
import {
  describe,
  describeTagged,
  getUserFacing,
} from "./description/debug/describe.js";
import Desc from "./description/debug/index.js";

const untrackedReadBarrier = (() => {
  /* FIXME: do nothing for now */
}) satisfies DebugRuntime["untrackedReadBarrier"];

let debugEnv = {
  Desc: () => undefined,
  callerStack: () => undefined,
  getUserFacing: (x) => x,
  untrackedReadBarrier: () => undefined,
  describe: () => '',
  describeTagged: () => '',
  markEntryPoint: () => undefined,
  getEntryPoint: () => undefined,
} satisfies DebugRuntime;

if (import.meta.env.DEV) {
  debugEnv = {
    Desc,
    callerStack,
    getUserFacing,
    untrackedReadBarrier,
    describe,
    describeTagged,
    markEntryPoint,
    getEntryPoint,
  } satisfies DebugRuntime;
}

export default debugEnv;

