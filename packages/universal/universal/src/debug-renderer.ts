import type { Description, Unsubscribe } from "@starbeam/interfaces";
import { Formula, RUNTIME } from "@starbeam/reactive";
import { PUBLIC_TIMELINE } from "@starbeam/runtime";

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
      RUNTIME.Desc?.("formula", description ?? "DEBUG_RENDERER")
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
