import { cell } from "@starbeam/reactive";

export class LiterCounter {
  #liters = cell(0);

  increment() {
    this.#liters.current++;
  }

  get description() {
    return this.#format(this.#liters.current);
  }

  #format(liters: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "unit",
      unit: "liter",
      unitDisplay: "long",
    }).format(liters);
  }
}
