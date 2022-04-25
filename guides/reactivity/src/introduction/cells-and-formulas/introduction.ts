import { reactive } from "@starbeam/core";

const state = reactive({
  liters: 0,
});

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

format(state.liters); //? "0 liters"

increment();
format(state.liters); //? "1 liter"

increment();
format(state.liters); //? "2 liters"