import {
  isEmptyArray,
  isPresentArray,
  isSingleItemArray,
  Overload,
  stringify,
} from "@starbeam/core-utils";
import util from "util";

import { Fragment } from "./log.js";
import type { Package } from "./packages.js";
import type { Reporter } from "./reporter/reporter.js";
import { StarbeamType } from "./unions.js";

export class SingleFilter implements Filter {
  static ok(key: FilterKey, matches: string | boolean = true): SingleFilter {
    return new SingleFilter(key, matches);
  }

  static none(): SingleFilter {
    return new SingleFilter("none", true);
  }

  static not(key: FilterKey, matches: string | boolean = true): Filter {
    return new NotFilter(SingleFilter.ok(key, matches));
  }

  static err(source: string, reason: string): ParseError {
    return new ParseError(source, reason);
  }

  readonly type = "ok";
  readonly kind = "single";
  readonly operator = "=";

  constructor(readonly key: FilterKey, readonly value: string | boolean) {}

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
    switch (this.key) {
      case "typescript":
        return pkg.isTypescript === this.value;
      case "private":
        return pkg.isPrivate === this.value;
      case "name":
        return pkg.name === this.value;
      case "scope": {
        const [scope] = pkg.name.split("/");
        return scope === this.value;
      }
      case "type": {
        const type = pkg.type;
        return type.value === this.value ? true : false;
      }
      case "none":
        return false;
    }
  }
}

class NotFilter implements Filter {
  readonly type = "ok";
  readonly kind = "not";
  readonly key: FilterKey;
  readonly value: string | boolean;
  readonly operator = "!=";

  readonly #filter: SingleFilter;

  constructor(filter: SingleFilter) {
    this.#filter = filter;
    this.key = filter.key;
    this.value = filter.value;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return `not ${util.inspect(this.#filter)}`;
  }

  match(pkg: Package): boolean {
    return !this.#filter.match(pkg);
  }
}

class AllFilter {
  static empty(): AllFilter {
    return new AllFilter([]);
  }

  static of(filter: Filter): AllFilter {
    return new AllFilter([filter]);
  }

  readonly type = "ok";
  readonly kind = "all";

  readonly #filters: (Filter | ParseError)[];

  constructor(filters: (Filter | ParseError)[]) {
    this.#filters = filters;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return `${this.#filters.map((f) => util.inspect(f)).join(" & ")}`;
  }

  get errors(): ParseError[] {
    return this.#filters.filter((f) => f instanceof ParseError) as ParseError[];
  }

  hasFilters(): boolean {
    return isPresentArray(this.#filters);
  }

  filters(key: FilterKey): boolean {
    return this.#filters.some(
      (f) => !(f instanceof ParseError) && f.key === key
    );
  }

  filtersExactly(key: FilterKey): boolean {
    const filters = this.#filters.filter(
      (f) => !(f instanceof ParseError) && f.key === key && f.operator === "="
    );

    return isSingleItemArray(filters);
  }

  add(filter: Filter | ParseError): void {
    this.#filters.push(filter);
  }

  and(filter: Filter): AllFilter {
    const filters = [...this.#filters, filter];
    return new AllFilter(filters);
  }

  match(pkg: Package): boolean {
    if (isEmptyArray(this.#filters)) {
      return true;
    }

    return this.#filters.every(
      (f) => !(f instanceof ParseError) && f.match(pkg)
    );
  }
}

class AnyFilter {
  static empty(): AnyFilter {
    return new AnyFilter([]);
  }

  static of(filter: Filter): AnyFilter {
    return new AnyFilter([filter]);
  }

  readonly type = "ok";
  readonly kind = "any";

  readonly #filters: (Filter | ParseError)[];

  constructor(filters: (Filter | ParseError)[]) {
    this.#filters = filters;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return `${this.#filters.map((f) => util.inspect(f)).join(" | ")}`;
  }

  get errors(): ParseError[] {
    return this.#filters.filter((f) => f instanceof ParseError) as ParseError[];
  }

  hasFilters(): boolean {
    return isPresentArray(this.#filters);
  }

  add(filter: Filter | ParseError): void {
    this.#filters.push(filter);
  }

  or(filter: Filter | ParseError): AnyFilter {
    const filters = [...this.#filters, filter];
    return new AnyFilter(filters);
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

    return this.#filters.some(
      (f) => !(f instanceof ParseError) && f.match(pkg)
    );
  }
}

type FilterArgs =
  | [Filter | ParseError]
  | [key: FilterKey, value?: string | boolean | undefined];

export class Query {
  static readonly all = Query.empty();

  static empty(): Query {
    return new Query(AnyFilter.empty(), AllFilter.empty());
  }

  static none(): Query {
    return new Query(AnyFilter.empty(), AllFilter.of(SingleFilter.none()));
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

  and(filter: Filter | ParseError): Query;
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

  #resolveArgs(args: FilterArgs): Filter | ParseError {
    return Overload<Filter | ParseError>().resolve(args, {
      [1]: (filter) =>
        typeof filter === "string" ? SingleFilter.ok(filter, true) : filter,
      [2]: (key, value) => SingleFilter.ok(key, value),
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
    return this.#all.match(pkg) && this.#any.match(pkg, reporter);
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

export type FilterOperator = "=" | "!=";

export interface Filter {
  readonly type: "ok" | "error";
  readonly kind: "single" | "not";
  readonly key: FilterKey;
  readonly value: string | boolean;
  readonly operator: FilterOperator;
  readonly match: (pkg: Package) => boolean;
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
type OkFilter = SingleFilter | NotFilter | AnyFilter | AllFilter;
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

    return parsePair([rawKey, rawValue], query, SingleFilter.not);
  }

  if (query.includes("=")) {
    const [rawKey, value] = query.split("=") as [string, string];
    return parsePair([rawKey, value], query, SingleFilter.ok);
  }

  const key = parseKey(query, query);

  if (typeof key === "string") {
    return SingleFilter.ok(key);
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
