import glob from "fast-glob";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { Query } from "./query.js";

export type StarbeamType =
  | "interfaces"
  | "library"
  | "tests"
  | "demo:react"
  | "unknown"
  | "draft";

export interface PackageInfo {
  name: string;
  main?: string;
  root: string;
  isPrivate: boolean;
  isTypescript: boolean;
  starbeam: {
    tsconfig: string | undefined;
    type: StarbeamType | undefined;
    used: Used[];
  };
}

export class Package {
  constructor(readonly info: PackageInfo) {}

  get name(): string {
    return this.info.name;
  }

  get root(): string {
    return this.info.root;
  }

  get isPrivate(): boolean {
    return this.info.isPrivate;
  }

  get isTypescript(): boolean {
    return this.info.isTypescript;
  }

  get isTests(): boolean {
    return this.type === "tests";
  }

  get tsconfig(): string | undefined {
    return this.info.starbeam.tsconfig;
  }

  get type():
    | "interfaces"
    | "library"
    | "tests"
    | "unknown"
    | "draft"
    | "demo:react"
    | undefined {
    return this.info.starbeam.type;
  }

  get used(): Used[] {
    return this.info.starbeam.used;
  }

  resolve(...path: string[]): string {
    return resolve(this.root, ...path);
  }
}

export interface Used {
  reason: string;
  packages: string[];
}

export function getPackage(path: string): Package {
  const pkg = JSON.parse(readFileSync(path, "utf8"));

  if (pkg === null || typeof pkg !== "object") {
    throw Error(`Invalid package.json at ${path}`);
  }

  const root = dirname(path);

  const raw = new RawPackage(pkg, root);

  const main = raw.get("main", { default: undefined as undefined | string });

  return new Package({
    name: raw.get("name"),
    main,
    root,
    isPrivate: raw.get("private", { default: false }),
    isTypescript:
      !!raw.get("type", { default: undefined }) ||
      !!raw.get("exports:.:types", { default: undefined }) !== undefined,
    starbeam: {
      tsconfig: raw.get("starbeam:tsconfig", { default: undefined }),
      type: raw.get("starbeam:type", { default: main ? undefined : "unknown" }),
      used: raw.get("starbeam:used", { default: [] }),
    },
  });
}

export function queryPackages(
  root: string,
  query: Query = Query.all
): Package[] {
  return glob
    .sync([
      resolve(root, "packages/*/package.json"),
      resolve(root, "packages/*/tests/package.json"),
      resolve(root, "framework/*/*/package.json"),
      resolve(root, "framework/*/*/tests/package.json"),
      resolve(root, "demos/*/package.json"),
    ])
    .map((path) => getPackage(path))
    .filter((pkg) => query.match(pkg));
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

class RawPackage {
  readonly #pkg: Record<string, JsonValue>;
  readonly #root: string;

  constructor(pkg: Record<string, JsonValue>, root: string) {
    this.#pkg = pkg;
    this.#root = root;
  }

  get<T>(key: string | string[], options?: { default: T }): T {
    const keys = this.#key(key);

    if (typeof key === "string" && key.includes(":")) {
      if (key in this.#pkg) {
        return this.#pkg[key] as T;
      }
    }

    return this.#get({ key: keys, soFar: [], options });
  }

  #key(key: string | string[]): string[] {
    if (Array.isArray(key)) {
      return key;
    } else {
      return key.split(":");
    }
  }

  #get<T>({
    object = this.#pkg,
    key,
    soFar,
  }: {
    object?: Record<string, JsonValue>;
    key: string[];
    soFar: string[];
  }): T;
  #get<T>(options: {
    object?: Record<string, JsonValue>;
    key: string[];
    soFar: string[];
    options?: { default: T };
  }): T;
  #get<T>({
    object = this.#pkg,
    key,
    soFar,
    options,
  }: {
    object?: Record<string, JsonValue>;
    key: string[];
    soFar: string[];
    options?: { default: T };
  }): T | undefined {
    if (key.length === 0) {
      return undefined;
    } else {
      const [first, ...rest] = key;

      if (first in object) {
        if (rest.length === 0) {
          return object[first] as T;
        } else {
          const next = object[first];

          if (typeof next === "object" && next !== null) {
            return this.#get({
              object: next as Record<string, JsonValue>,
              key: rest,
              soFar: [...soFar, first],
              options,
            });
          } else if (options && "default" in options) {
            return options.default;
          }
        }
      } else if (options && "default" in options) {
        return options.default;
      }

      throw Error(
        `invalid package.json: missing ${formatKey(
          soFar,
          first
        )} in package.json (at ${this.#root})`
      );
    }
  }
}

function formatKey(soFar: string[], key: string): string {
  if (soFar.length === 0) {
    return key;
  } else {
    return `${soFar.join(".")}.${key}`;
  }
}

export function getPackages(
  root: string,
  name: string,
  scope?: string
): Package[] {
  const all = queryPackages(root);

  if (name === "any") {
    return all;
  }

  const pkgName = normalizePackageName(name, scope);

  return all.filter((pkg) => pkg.name === pkgName);
}

function normalizePackageName(name: string, scope: string | undefined): string {
  if (name === "all") {
    return "all";
  } else if (name.startsWith("@") || scope === undefined) {
    return name;
  } else {
    return `@${scope}/${name}`;
  }
}
