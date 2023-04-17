import type { Description, Unsubscribe } from "@starbeam/interfaces";
import { DEBUG, Formula } from "@starbeam/reactive";
import { render } from "@starbeam/runtime";

export const DEBUG_RENDERER = {
  render<T>(
    {
      render: evaluate,
      debug,
    }: {
      render: () => T;
      debug: (value: T) => void;
    },
    description?: Description | string
  ): Unsubscribe {
    const formula = Formula(
      evaluate,
      DEBUG.Desc?.("formula", description ?? "DEBUG_RENDERER")
    );

    debug(formula.read());

    let dirty = false;
    return render(formula, () => {
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
