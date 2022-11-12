import {
  isEmptyArray,
  isPresentArray,
  isSingleItemArray,
} from "@starbeam/core-utils";
import type { Reporter } from "@starbeam-workspace/reporter";
import util from "util";

import type { Package } from "../package";
import { StarbeamType } from "../unions.js";
import { ParseError } from "./query";

export class SingleFilter implements Filter {
  readonly type = "ok";
  readonly kind = "single";
  readonly operator: "=" | "!=";

  constructor(
    readonly key: FilterKey,
    readonly value: string | boolean,
    operator: "=" | "!="
  ) {
    this.operator = operator;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    if (this.value === true) {
      return `${this.key}`;
    } else if (this.value === false) {
      return `not ${this.key}`;
    } else {
      return `${this.key}=${this.value}`;
    }
  }

  match(pkg: Package): boolean {
    return match(pkg, this.key, this.value, this.operator);
  }
}

function match(
  pkg: Package,
  key: FilterKey,
  value: string | boolean,
  operator: "=" | "!="
): boolean {
  const equals = matchEq(pkg, key, value);

  return operator === "=" ? equals : !equals;
}

function matchEq(
  pkg: Package,
  key: FilterKey,
  value: string | boolean
): boolean {
  switch (key) {
    case "typescript":
      return pkg.isTypescript === value;
    case "private":
      return pkg.isPrivate === value;
    case "name":
      return pkg.name === value;
    case "scope": {
      const [scope] = pkg.name.split("/");
      return scope === value;
    }
    case "type": {
      const type = pkg.type;
      return type.value === value ? true : false;
    }
    case "none":
      return false;
  }
}

abstract class ListFilter implements Matchable {
  static empty<This extends new (filters: (Filter | ParseError)[]) => T, T>(
    this: This
  ): T {
    return new this([]);
  }

  static of<This extends new (filters: (Filter | ParseError)[]) => T, T>(
    this: This,
    filter: Filter
  ): T {
    return new this([filter]);
  }

  readonly type = "ok";
  abstract readonly kind: "all" | "any";
  abstract readonly operator: FilterOperator;

  readonly #filters: (Matchable | ParseError)[];
  readonly #match: (
    filters: Matchable[],
    pkg: Package,
    reporter: Reporter
  ) => boolean;

  constructor(
    filters: (Matchable | ParseError)[],
    match: (filters: Matchable[], pkg: Package, reporter: Reporter) => boolean
  ) {
    this.#filters = filters;
    this.#match = match;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return `${this.#filters
      .map((f) => util.inspect(f))
      .join(` ${this.operator} `)}`;
  }

  get errors(): ParseError[] {
    return this.#filters.filter((f) => f instanceof ParseError) as ParseError[];
  }

  hasFilters(): boolean {
    return isPresentArray(this.#filters);
  }

  filtersExactly(key: FilterKey): boolean {
    const filters = this.#filters.filter(
      (f) => f instanceof SingleFilter && f.key === key && f.operator === "="
    );

    return isSingleItemArray(filters);
  }

  add(filter: Matchable | ParseError): void {
    this.#filters.push(filter);
  }

  and(filter: Matchable): AllFilter {
    const filters = [...this.#filters, filter];
    return new AllFilter(filters);
  }

  match(pkg: Package, reporter: Reporter): boolean {
    if (isEmptyArray(this.#filters)) {
      return true;
    }

    const problem = this.#filters.find((f) => f instanceof ParseError);

    if (problem instanceof ParseError) {
      problem.log(reporter);
      return false;
    }

    return this.#match(this.#filters as Filter[], pkg, reporter);
  }
}

export class AllFilter extends ListFilter {
  readonly kind = "all";
  readonly operator = "&";

  constructor(filters: (Matchable | ParseError)[]) {
    super(filters, (filters, pkg, reporter) =>
      filters.every((f) => f.match(pkg, reporter))
    );
  }
}

export class AnyFilter extends ListFilter {
  readonly kind = "any";
  readonly operator = "|";

  constructor(filters: (Matchable | ParseError)[]) {
    super(filters, (filters, pkg, reporter) =>
      filters.some((f) => f.match(pkg, reporter))
    );
  }
}

export type FilterKey =
  | "typescript"
  | "type"
  | "private"
  | "name"
  | "scope"
  | "none";

export const FILTER_KEYS: Record<FilterKey, [kind: string, example: string]> = {
  typescript: ["package authored in TypeScript", "-a typescript"],
  private: ["is a private package", "-a private"],
  none: ["match nothing", "-a none"],
  type: [`type of the package (${StarbeamType.format()})`, "-a type=library"],
  name: ["package name", "-a name=@starbeam/universal"],
  scope: ["package scope", "-a scope=@starbeam"],
};

export type FilterOperator = "=" | "!=" | "&" | "|";

export interface Matchable {
  readonly match: (pkg: Package, reporter: Reporter) => boolean;
}

export interface Filter extends Matchable {
  readonly type: "ok" | "error";
  readonly kind: "single" | "not" | "any" | "all";
  readonly key: FilterKey;
  readonly value: string | boolean;
  readonly operator: FilterOperator;
}

export const Filter = {
  equals: (key: FilterKey, matches: string | boolean = true): SingleFilter => {
    return new SingleFilter(key, matches, "=");
  },

  notEquals: (
    key: FilterKey,
    matches: string | boolean = true
  ): SingleFilter => {
    return new SingleFilter(key, matches, "!=");
  },
} as const;
