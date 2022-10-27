import type { TableTypes, TableTypesFor, UserTypes } from "./table.js";

export interface Aggregator<T, U = T> {
  initialize: () => AggregatorInstance<T, U>;
}

export interface AggregatorInstance<T, U = T> {
  add: (value: T) => void;
  value: () => U;
}

export type AggregatorFor<U extends UserTypes> = {
  [K in keyof TableTypesFor<U>["Columns"]]?: Aggregator<
    TableTypesFor<U>["Columns"][K],
    unknown
  >;
};

export type AggregateRow<T extends TableTypes, A extends AggregatorFor<T>> = {
  [K in keyof T["Columns"]]: A[K] extends {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialize: () => AggregatorInstance<any, infer V>;
  }
    ? V
    : never;
};

const INITIAL_SUM = 0;

export class Sum implements AggregatorInstance<number, number> {
  static initialize(): Sum {
    return new Sum();
  }

  #value = INITIAL_SUM;

  add(value: number): void {
    this.#value += value;
  }

  value(): number {
    return this.#value;
  }
}

const INITIAL_COUNT = 0;

export class Average implements AggregatorInstance<number, number> {
  static initialize(): Average {
    return new Average();
  }

  #value = INITIAL_SUM;
  #count = INITIAL_COUNT;

  add(value: number): void {
    this.#value += value;
    this.#count++;
  }

  value(): number {
    return this.#value / this.#count;
  }
}
