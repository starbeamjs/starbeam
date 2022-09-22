import { type Package, type StarbeamType } from "./packages.js";
import chalk from "chalk";
import util from "util";

export class SingleFilter implements Filter {
  static ok(key: FilterKey, matches: string | boolean = true): SingleFilter {
    return new SingleFilter(key, matches);
  }

  static none(): SingleFilter {
    return new SingleFilter("none", true);
  }

  static err(source: string, reason: string): ParseError {
    return new ParseError(source, reason);
  }

  readonly type = "ok";
  readonly kind = "single";

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
        return type === this.value;
      }
      case "none":
        return false;
    }
  }
}

class AllFilter {
  static empty(): AllFilter {
    return new AllFilter([]);
  }

  static of(filter: Filter) {
    return new AllFilter([filter]);
  }

  readonly type = "ok";
  readonly kind = "all";

  readonly #filters: Filter[];

  constructor(filters: Filter[]) {
    this.#filters = filters;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return `${this.#filters.map((f) => util.inspect(f)).join(" & ")}`;
  }

  hasFilters(): boolean {
    return this.#filters.length > 0;
  }

  filters(key: FilterKey): boolean {
    return this.#filters.some((f) => f.key === key);
  }

  add(filter: Filter): void {
    this.#filters.push(filter);
  }

  and(filter: Filter): AllFilter {
    const filters = [...this.#filters, filter];
    return new AllFilter(filters);
  }

  match(pkg: Package): boolean {
    if (this.#filters.length === 0) {
      return true;
    }

    return this.#filters.every((f) => f.match(pkg));
  }
}

class AnyFilter {
  static empty(): AnyFilter {
    return new AnyFilter([]);
  }

  static of(filter: Filter) {
    return new AnyFilter([filter]);
  }

  readonly type = "ok";
  readonly kind = "any";

  readonly #filters: Filter[];

  constructor(filters: Filter[]) {
    this.#filters = filters;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return `${this.#filters.map((f) => util.inspect(f)).join(" | ")}`;
  }

  hasFilters(): boolean {
    return this.#filters.length > 0;
  }

  add(filter: SingleFilter): void {
    this.#filters.push(filter);
  }

  or(filter: Filter): AnyFilter {
    const filters = [...this.#filters, filter];
    return new AnyFilter(filters);
  }

  match(pkg: Package): boolean {
    if (this.#filters.length === 0) {
      return true;
    }

    return this.#filters.some((f) => f.match(pkg));
  }
}

export class Query {
  static readonly all = Query.empty();

  static empty(): Query {
    return new Query(AnyFilter.empty(), AllFilter.empty(), []);
  }

  static none(): Query {
    return new Query(AnyFilter.empty(), AllFilter.of(SingleFilter.none()), []);
  }

  #any: AnyFilter;
  #all: AllFilter;
  #errors: ParseError[];

  constructor(any: AnyFilter, all: AllFilter, errors: ParseError[]) {
    this.#any = any;
    this.#all = all;
    this.#errors = errors;
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

  and(filter: SingleFilter): Query;
  and(key: FilterKey, value?: string | boolean): Query;
  and(
    ...args: [SingleFilter] | [key: FilterKey, value?: string | boolean]
  ): Query {
    if (typeof args[0] === "string") {
      this.#all.add(
        SingleFilter.ok(
          args[0] as FilterKey,
          args[1] ?? (true as string | boolean)
        )
      );
    } else {
      this.#all.add(args[0] as SingleFilter);
    }

    return this;
  }

  or(filter: SingleFilter): Query;
  or(key: FilterKey, value?: string | boolean): Query;
  or(
    ...args: [SingleFilter] | [key: FilterKey, value?: string | boolean]
  ): Query {
    if (typeof args[0] === "string") {
      this.#any.add(
        SingleFilter.ok(
          args[0] as FilterKey,
          args[1] ?? (true as string | boolean)
        )
      );
    } else {
      this.#any.add(args[0] as SingleFilter);
    }

    return this;
  }

  unifies(filter: FilterKey): boolean {
    return this.#all.filters(filter);
  }

  get errors(): ParseError[] | null {
    return this.#errors.length > 0 ? this.#errors : null;
  }

  match(pkg: Package): boolean {
    return this.#all.match(pkg) && this.#any.match(pkg);
  }
}

export type FilterKey =
  | "typescript"
  | "type"
  | "private"
  | "name"
  | "scope"
  | "none";

export const STARBEAM_TYPES: StarbeamType[] = [
  "interfaces",
  "library",
  "tests",
  "unknown",
  "draft",
];

export const FILTER_KEYS: Record<FilterKey, [kind: string, example: string]> = {
  typescript: ["package authored in TypeScript", "-a typescript"],
  private: ["is a private package", "-a private"],
  none: ["match nothing", "-a none"],
  type: [
    `type of the package (${STARBEAM_TYPES.join(" | ")})`,
    "-a type=library",
  ],
  name: ["package name", "-a name=@starbeam/core"],
  scope: ["package scope", "-a scope=@starbeam"],
};

export interface Filter {
  readonly type: "ok" | "error";
  readonly kind: "single";
  readonly key: FilterKey;
  readonly match: (pkg: Package) => boolean;
}

class ParseError {
  readonly type = "error";

  constructor(readonly source: string, readonly message: string) {}

  log(): void {
    console.log(`${chalk.red("Invalid query")}: ${chalk.grey(this.source)}`);
  }
}
type OkFilter = SingleFilter | AnyFilter | AllFilter;
export type ParsedFilter = OkFilter | ParseError;
function parseKey(key: string): FilterKey {
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
      throw Error(`Invalid filter key: ${key}`);
  }
}
export function parse(query: string): SingleFilter | ParseError {
  if (query.includes("=")) {
    const [rawKey, value] = query.split("=");
    const key = parseKey(rawKey);

    switch (value) {
      case "true":
      case "false":
        return SingleFilter.ok(key, value === "true");
      default:
        return SingleFilter.ok(key, value);
    }
  }

  const key = parseKey(query);

  return SingleFilter.ok(key);
}
export function formatScope(scope: string): string {
  if (scope.startsWith("@")) {
    return scope;
  } else {
    return `@${scope}`;
  }
}
