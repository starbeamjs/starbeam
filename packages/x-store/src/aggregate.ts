import type { TableTypes } from "./table.js";

export interface Aggregator<T, U = T> {
  initialize: () => AggregatorInstance<T, U>;
}

export interface AggregatorInstance<T, U = T> {
  add(value: T): void;
  value(): U;
}

export type AggregatorFor<T extends TableTypes> = {
  [K in keyof T["Columns"]]?: Aggregator<T["Columns"][K], unknown>;
};

export type AggregateRow<T extends TableTypes, A extends AggregatorFor<T>> = {
  [K in keyof T["Columns"]]: A[K] extends {
    initialize: () => AggregatorInstance<any, infer V>;
  }
    ? V
    : never;
};

export class Sum implements AggregatorInstance<number, number> {
  static initialize(): Sum {
    return new Sum();
  }

  #value = 0;

  add(value: number): void {
    this.#value += value;
  }

  value(): number {
    return this.#value;
  }
}

export class Average implements AggregatorInstance<number, number> {
  static initialize(): Average {
    return new Average();
  }

  #value = 0;
  #count = 0;

  add(value: number): void {
    this.#value += value;
    this.#count++;
  }

  value(): number {
    return this.#value / this.#count;
  }
}
