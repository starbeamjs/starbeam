import { type Description, descriptionFrom } from "@starbeam/debug";
import type { Unsubscribe } from "@starbeam/interfaces";
import { PUBLIC_TIMELINE } from "@starbeam/runtime";

import { Formula } from "./reactive-core/formula/formula.js";

export const DEBUG_RENDERER = {
  render<T>(
    {
      render,
      debug,
    }: {
      render: () => T;
      debug: (value: T) => void;
    },
    description?: Description | string
  ): Unsubscribe {
    const formula = Formula(
      render,
      descriptionFrom({
        type: "renderer",
        api: "DEBUG_RENDERER",
        fromUser: description,
      })
    );

    debug(formula.read());

    let dirty = false;
    return PUBLIC_TIMELINE.on.change(formula, () => {
      if (!dirty) {
        dirty = true;

        queueMicrotask(() => {
          dirty = false;
          debug(formula.read());
        });
      }
    });
  },
};
