import type { TableTypes } from "./table.js";

export type FilterFn<T extends TableTypes> = (row: T["Row"]) => boolean;
export type Filter<T extends TableTypes> = FilterFn<T> | FilterInstance<T>;

export interface FilterInstance<T extends TableTypes> {
  matches(row: T["Row"]): boolean;
  and(...filters: Filter<T>[]): FilterInstance<T>;
  or(...filters: Filter<T>[]): FilterInstance<T>;
}

export function filter<T extends TableTypes>(
  filter: Filter<T>
): FilterInstance<T> {
  if (typeof filter === "function") {
    return new SingleFilter(filter);
  } else {
    return filter;
  }
}

filter.unfiltered = function <T extends TableTypes>(): FilterInstance<T> {
  return new UnfilteredFilter();
};

filter.all = function <T extends TableTypes>(
  ...filters: Filter<T>[]
): FilterInstance<T> {
  return new EveryFilter(...filters.map(filter));
};

filter.any = function <T extends TableTypes>(
  ...filters: Filter<T>[]
): FilterInstance<T> {
  return new SomeFilter(...filters.map(filter));
};

export class UnfilteredFilter<T extends TableTypes>
  implements FilterInstance<T>
{
  matches(_row: T["Row"]): boolean {
    return true;
  }

  and(...filters: Filter<T>[]): FilterInstance<T> {
    return new EveryFilter(...filters.map(filter));
  }

  or(...filters: Filter<T>[]): FilterInstance<T> {
    return new SomeFilter(...filters.map(filter));
  }
}

export class SingleFilter<T extends TableTypes> implements FilterInstance<T> {
  #filter: (row: T["Row"]) => boolean;

  constructor(row: (row: T["Row"]) => boolean) {
    this.#filter = row;
  }

  and(...filters: Filter<T>[]): FilterInstance<T> {
    return new EveryFilter(this, ...filters.map(filter));
  }

  or(...filters: Filter<T>[]): FilterInstance<T> {
    return new SomeFilter(this, ...filters.map(filter));
  }

  matches(row: T["Row"]): boolean {
    return this.#filter(row);
  }
}

export class EveryFilter<T extends TableTypes> implements FilterInstance<T> {
  #filters: FilterInstance<T>[];

  constructor(...filters: FilterInstance<T>[]) {
    this.#filters = filters;
  }

  and(...filters: Filter<T>[]): FilterInstance<T> {
    return new EveryFilter(...this.#filters, ...filters.map(filter));
  }

  or(...filters: Filter<T>[]): FilterInstance<T> {
    return new SomeFilter(this, ...filters.map(filter));
  }

  matches(row: T["Row"]): boolean {
    return this.#filters.every((filter) => filter.matches(row));
  }
}

export class SomeFilter<T extends TableTypes> implements FilterInstance<T> {
  #filters: FilterInstance<T>[];

  constructor(...filters: FilterInstance<T>[]) {
    this.#filters = filters;
  }

  and(...filters: Filter<T>[]): FilterInstance<T> {
    return new EveryFilter(this, ...filters.map(filter));
  }

  or(...filters: Filter<T>[]): FilterInstance<T> {
    return new SomeFilter(...this.#filters, ...filters.map(filter));
  }

  matches(row: T["Row"]): boolean {
    return this.#filters.some((filter) => filter.matches(row));
  }
}
