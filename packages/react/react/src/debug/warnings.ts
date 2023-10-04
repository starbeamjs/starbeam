import { isPresent } from "@starbeam/core-utils";
import { DEBUG } from "@starbeam/universal";
import { isRendering } from "@starbeam/use-strict-lifecycle";
import { verified } from "@starbeam/verify";

let WARNED = false;

if (import.meta.env.DEV) {
  const debug = verified(DEBUG, isPresent);
  debug.untrackedReadBarrier((_tag, _caller) => {
    if (isRendering()) {
      if (!WARNED) {
        WARNED = true;

        // @todo restore this warning
      }

      throw Error(
        `You read from a reactive value, but you were not inside the \`useReactive\` hook.`,
      );
    }
  });
}
