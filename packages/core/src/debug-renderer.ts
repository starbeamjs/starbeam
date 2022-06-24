import { type DescriptionArgs, Stack } from "@starbeam/debug";
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
    description?: DescriptionArgs | string
  ): void {
    const formula = Formula(render, Stack.description(description));
    const renderable = TIMELINE.render(formula, () => {
      debug(formula.current);
    });
    renderable.poll();
  },
};
