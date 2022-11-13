import { isPresentArray, Overload, stringify } from "@starbeam/core-utils";
import type { Reporter } from "@starbeam-workspace/reporter";
import { Fragment } from "@starbeam-workspace/reporter";
import util from "util";

import type { Package } from "../package";
import type { FilterKey, Matchable, SingleFilter } from "./filters";
import { AllFilter, AnyFilter, Filter } from "./filters";

type FilterArgs =
  | [Matchable | ParseError]
  | [key: FilterKey, value?: string | boolean | undefined];

export class Query {
  static readonly all = Query.empty();

  static empty(): Query {
    return new Query(AnyFilter.empty(), AllFilter.empty());
  }

  #any: AnyFilter;
  #all: AllFilter;

  constructor(any: AnyFilter, all: AllFilter) {
    this.#any = any;
    this.#all = all;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object | string {
    const errors = this.errors;

    if (errors) {
      return {
        type: "error",
        errors,
      };
    } else {
      if (this.#any.hasFilters() && this.#all.hasFilters()) {
        return `${util.inspect(this.#any)} & ${util.inspect(this.#all)}`;
      } else if (this.#any.hasFilters()) {
        return this.#any;
      } else if (this.#all.hasFilters()) {
        return this.#all;
      } else {
        return "matches all";
      }
    }
  }

  and(filter: Matchable | ParseError): Query;
  and(key: FilterKey, value?: string | boolean | undefined): Query;
  and(...args: FilterArgs): this {
    this.#all.add(this.#resolveArgs(args));
    return this;
  }

  or(filter: Filter | ParseError): Query;
  or(key: FilterKey, value?: string | boolean | undefined): Query;
  or(...args: FilterArgs): this {
    this.#any.add(this.#resolveArgs(args));
    return this;
  }

  #resolveArgs(args: FilterArgs): Matchable | ParseError {
    return Overload<Matchable | ParseError>().resolve(args, {
      [1]: (filter) =>
        typeof filter === "string" ? Filter.equals(filter, true) : filter,
      [2]: (key, value) => Filter.equals(key, value),
    });
  }

  unifies(filter: FilterKey): boolean {
    return this.#all.filtersExactly(filter);
  }

  get errors(): ParseError[] | null {
    const errors = [...this.#any.errors, ...this.#all.errors];
    return isPresentArray(errors) ? errors : null;
  }

  match(pkg: Package, reporter: Reporter): boolean {
    return this.#all.match(pkg, reporter) && this.#any.match(pkg, reporter);
  }
}

export class ParseError {
  readonly type = "error";

  constructor(readonly source: string, readonly message: string) {}

  log(reporter: Reporter): void {
    reporter.log(
      stringify`${Fragment.problem("Invalid query")}${Fragment.comment(
        `: ${this.source}`
      )}`
    );
  }
}
type OkFilter = SingleFilter | AnyFilter | AllFilter;
export type ParsedFilter = OkFilter | ParseError;

function parseKey(key: string, source: string): FilterKey | ParseError {
  switch (key) {
    case "ts":
      return "typescript";
    case "typescript":
    case "private":
    case "name":
    case "scope":
    case "type":
    case "none":
      return key;
    default:
      return new ParseError(source, `unknown filter key: ${key}`);
  }
}
export function parse(query: string): Filter | ParseError {
  if (query.includes("!=")) {
    const [rawKey, rawValue] = query.split("!=") as [string, string];

    return parsePair([rawKey, rawValue], query, Filter.notEquals);
  }

  if (query.includes("=")) {
    const [rawKey, value] = query.split("=") as [string, string];
    return parsePair([rawKey, value], query, Filter.equals);
  }

  const key = parseKey(query, query);

  if (typeof key === "string") {
    return Filter.equals(key);
  } else {
    return key;
  }
}

function parsePair(
  [rawKey, value]: [string, string],
  source: string,
  construct: (key: FilterKey, matches?: string | boolean) => Filter
): Filter | ParseError {
  const key = parseKey(rawKey, source);

  if (typeof key !== "string") {
    return key;
  }

  switch (value) {
    case "true":
    case "false":
      return construct(key, value === "true");
    default:
      return construct(key, value);
  }
}

export function formatScope(scope: string): string {
  if (scope.startsWith("@")) {
    return scope;
  } else {
    return `@${scope}`;
  }
}
