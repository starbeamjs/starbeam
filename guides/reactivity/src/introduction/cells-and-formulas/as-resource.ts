// ANCHOR: LiterCounter
import { reactive } from "@starbeam/core";
import { formula } from "@starbeam/reactive";

export const LiterCounter = resource(() => {
  const state = reactive({ liters: 0 });

  const increment = () => {
    state.liters++;
  };

  function format(liters: number) {
    return new Intl.NumberFormat("en-US", {
      style: "unit",
      unit: "liter",
      unitDisplay: "long",
    }).format(liters);
  }

  const description = formula(() => format(state.liters));

  return {
    description,
    increment,
  };
});
// ANCHOR_END: LiterCounter

function resource(arg0: unknown) {
  throw new Error("Function not implemented.");
}
