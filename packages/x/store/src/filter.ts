import type { TableTypes, TableTypesFor, UserTypes } from "./table.js";

export type FilterFn<U extends UserTypes> = (
  row: TableTypesFor<U>["Row"]
) => boolean;
export type Filter<U extends UserTypes> = FilterFn<U> | FilterInstance<U>;

export interface FilterInstance<U extends UserTypes> {
  matches: (row: TableTypesFor<U>["Row"]) => boolean;
  and: (...filters: Filter<U>[]) => FilterInstance<U>;
  or: (...filters: Filter<U>[]) => FilterInstance<U>;
}

export function Filter<U extends UserTypes>(
  filter: Filter<U>
): FilterInstance<U> {
  if (typeof filter === "function") {
    return new SingleFilter(filter);
  } else {
    return filter;
  }
}

Filter.unfiltered = function <T extends TableTypes>(): FilterInstance<T> {
  return new UnfilteredFilter();
};

Filter.all = function <T extends TableTypes>(
  ...filters: Filter<T>[]
): FilterInstance<T> {
  return new EveryFilter(...filters.map(Filter));
};

Filter.any = function <T extends TableTypes>(
  ...filters: Filter<T>[]
): FilterInstance<T> {
  return new SomeFilter(...filters.map(Filter));
};

export class UnfilteredFilter<T extends TableTypes>
  implements FilterInstance<T>
{
  matches(_row: T["Row"]): boolean {
    return true;
  }

  and(...filters: Filter<T>[]): FilterInstance<T> {
    return new EveryFilter(...filters.map(Filter));
  }

  or(...filters: Filter<T>[]): FilterInstance<T> {
    return new SomeFilter(...filters.map(Filter));
  }
}

export class SingleFilter<T extends TableTypes> implements FilterInstance<T> {
  #filter: (row: T["Row"]) => boolean;

  constructor(row: (row: T["Row"]) => boolean) {
    this.#filter = row;
  }

  and(...filters: Filter<T>[]): FilterInstance<T> {
    return new EveryFilter(this, ...filters.map(Filter));
  }

  or(...filters: Filter<T>[]): FilterInstance<T> {
    return new SomeFilter(this, ...filters.map(Filter));
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
    return new EveryFilter(...this.#filters, ...filters.map(Filter));
  }

  or(...filters: Filter<T>[]): FilterInstance<T> {
    return new SomeFilter(this, ...filters.map(Filter));
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
    return new EveryFilter(this, ...filters.map(Filter));
  }

  or(...filters: Filter<T>[]): FilterInstance<T> {
    return new SomeFilter(...this.#filters, ...filters.map(Filter));
  }

  matches(row: T["Row"]): boolean {
    return this.#filters.some((filter) => filter.matches(row));
  }
}
