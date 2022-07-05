import { type DescriptionArgs, Stack, Description } from "@starbeam/debug";
import type { Renderable } from "@starbeam/timeline";
import { TIMELINE } from "@starbeam/timeline";

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
  ): Renderable<T> {
    const formula = Formula(
      render,
      Stack.description({
        type: "renderer",
        api: "DEBUG_RENDERER",
        fromUser: description,
      })
    );
    return TIMELINE.render(formula, () => {
      debug(formula.current);
    });
  },
};
