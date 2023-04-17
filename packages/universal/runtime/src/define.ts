import { debugRuntime as DEBUG_RUNTIME } from "@starbeam/debug";
import type { Runtime as IRuntime, TagSnapshot } from "@starbeam/interfaces";
import { defineRuntime } from "@starbeam/reactive";
import { consume, start } from "@starbeam/shared";

import { LIFETIME } from "./lifetime/api.js";
import { SUBSCRIPTION_RUNTIME } from "./timeline/render.js";

export const RUNTIME: IRuntime = {
  debug: DEBUG_RUNTIME,
  start: (): (() => TagSnapshot) => {
    const done = start();

    return () => new Set(done()) as TagSnapshot;
  },

  consume: (tag): void => void consume(tag),

  link: (parent, child) => LIFETIME.link(parent, child),
  finalize: (object) => void LIFETIME.finalize(object),
  onFinalize: (object, callback) => LIFETIME.on.cleanup(object, callback),

  ...SUBSCRIPTION_RUNTIME,
};

defineRuntime(RUNTIME);
