import { Directory, RegularFile, type Path } from "./paths.js";
import { Query } from "./query.js";
import { StarbeamSources, StarbeamType } from "./unions.js";
import type { Workspace } from "./workspace.js";
import sh from "shell-escape-tag";

export interface StarbeamTemplates {
  "package.json": string;
}

export interface StarbeamInfo {
  tsconfig: string | undefined;
  type: StarbeamType;
  sources: StarbeamSources;
  used: Used[];
  templates: StarbeamTemplates;
}

export interface PackageInfo {
  manifest: Path;
  name: string;
  main?: string;
  root: string;
  isPrivate: boolean;
  isTypescript: boolean;
  starbeam: StarbeamInfo;
  scripts: Record<string, string>;
  tests: Record<string, string>;
  dependencies: Dependencies;
}

export class Starbeam {
  #info: StarbeamInfo;

  constructor(info: StarbeamInfo) {
    this.#info = info;
  }

  get tsconfig(): string | undefined {
    return this.#info.tsconfig;
  }

  get type(): StarbeamType {
    return this.#info.type;
  }

  get used(): Used[] {
    return this.#info.used;
  }

  get templates(): StarbeamTemplates {
    return this.#info.templates;
  }

  isInput(extension: "d.ts" | "js"): boolean {
    return this.#info.sources.has(extension);
  }
}

interface PnpmPackage {
  name: string;
  version: string;
  path: string;
  private: boolean;
}

export class Package {
  static from(this: void, workspace: Workspace, manifest: RegularFile): Package;
  static from(
    this: void,
    workspace: Workspace,
    manifest: RegularFile,
    options: { allow: "missing" }
  ): Package | undefined;
  static from(
    this: void,
    workspace: Workspace,
    manifest: RegularFile,
    options?: { allow: "missing" }
  ): Package | undefined {
    const pkg = manifest.readSync<Record<string, JsonValue>>({ as: "json" });

    if (pkg === null || typeof pkg !== "object") {
      if (options?.allow === "missing") {
        return undefined;
      } else {
        throw Error(`Invalid package.json at ${manifest}`);
      }
    }

    const root = manifest.dirname;
    const raw = new RawPackage(pkg, root);

    const main = raw.get("main", { default: undefined as undefined | string });

    const scripts: Record<string, string> = raw.get("scripts", {
      default: {},
    });

    const tests: Record<string, string> = {};

    for (const [name, script] of Object.entries(scripts)) {
      if (name.startsWith("test:")) {
        tests[name.slice(5)] = script;
      }
    }

    const type = StarbeamType.from(
      raw.get("starbeam:type", {
        default: main ? "none" : "unknown",
      })
    );

    const source = StarbeamSources.from(
      raw.get("starbeam:source", {
        default: "ts",
      })
    );

    return new Package(workspace, {
      manifest,
      name: raw.get("name"),
      main,
      root,
      isPrivate: raw.get("private", { default: false }),
      isTypescript:
        !!raw.get("type", { default: undefined }) ||
        !!raw.get("exports:.:types", { default: undefined }) !== undefined,
      scripts,
      tests,
      dependencies: createDependencies(raw),
      starbeam: {
        tsconfig: raw.get("starbeam:tsconfig", { default: undefined }),
        type,
        sources: source,
        used: raw.get("starbeam:used", { default: [] }),
        templates: {
          "package.json": raw.get("starbeam:template:package", {
            default: "package.json",
          }),
        },
      },
    });
  }

  readonly #workspace: Workspace;

  constructor(workspace: Workspace, readonly info: PackageInfo) {
    this.#workspace = workspace;
  }

  get workspace(): Workspace {
    return this.#workspace;
  }

  get name(): string {
    return this.info.name;
  }

  get root(): Directory {
    return this.info.manifest.parent;
  }

  get sources(): StarbeamSources {
    return this.info.starbeam.sources;
  }

  get starbeam(): Starbeam {
    return new Starbeam(this.info.starbeam);
  }

  get isPrivate(): boolean {
    return this.info.isPrivate;
  }

  get isTypescript(): boolean {
    return this.info.isTypescript;
  }

  get tsconfig(): string | undefined {
    return this.info.starbeam.tsconfig;
  }

  get type(): StarbeamType {
    return this.info.starbeam.type;
  }

  get used(): Used[] {
    return this.info.starbeam.used;
  }

  get testsDirectory(): Directory {
    return this.root.dir("tests");
  }

  get tests(): Record<string, string> {
    return this.info.tests;
  }

  get dependencies(): Dependencies {
    return this.info.dependencies;
  }

  isSupport(kind: "tests" | "build"): boolean {
    return this.type === StarbeamType.from(`support:${kind}`);
  }

  isInput(kind: "d.ts" | "js"): boolean {
    return this.starbeam.isInput(kind);
  }
}

export type DependencyType = "normal" | "dev" | "peer" | "optional";

class Dependency {
  readonly #kind: DependencyType;
  readonly #name: string;
  readonly #version: string;

  constructor(kind: DependencyType, name: string, version: string) {
    this.#kind = kind;
    this.#name = name;
    this.#version = version;
  }

  is(kind: DependencyType): boolean {
    return this.#kind === kind;
  }

  get kind(): DependencyType {
    return this.#kind;
  }

  get name(): string {
    return this.#name;
  }

  get version(): string {
    return this.#version;
  }
}

class Dependencies {
  readonly #deps: Dependency[];

  constructor(deps: Dependency[]) {
    this.#deps = deps;
  }

  has(name: string, kind?: DependencyType): boolean {
    return !!this.get(name, kind);
  }

  get(name: string, kind?: DependencyType): Dependency | undefined {
    return this.#deps.find((dep) => {
      const match = dep.name === name;

      if (kind === undefined) {
        return match;
      } else {
        return match && dep.is(kind);
      }
    });
  }
}

export interface Used {
  reason: string;
  packages: string[];
}

export async function queryPackages(
  workspace: Workspace,
  query: Query = Query.all
): Promise<Package[]> {
  // const packages = workspace.paths.packages.all;
  // const tests = packages.dir("tests");
  // const demos = workspace.paths.demos.glob("*", { match: ["directories"] });
  // const scripts = workspace.root.glob("scripts");

  const packageList = await workspace.cmd(sh`pnpm ls -r --depth -1 --json`);

  if (packageList === undefined) {
    throw workspace.reporter.fatal("Failed to list packages");
  }

  const packages: PnpmPackage[] = JSON.parse(packageList);

  return packages
    .map((p) =>
      new Directory(workspace.root.absolute, p.path).file("package.json")
    )
    .map((manifest) => Package.from(workspace, manifest))
    .filter((pkg) => query.match(pkg));
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

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
      const shorthand = key.join(":");

      if (shorthand in object) {
        return object[shorthand] as T;
      }

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

function createDependencies(raw: RawPackage): Dependencies {
  return new Dependencies([
    ...parseDependencies(raw, "dependencies", "normal"),
    ...parseDependencies(raw, "devDependencies", "dev"),
    ...parseDependencies(raw, "peerDependencies", "peer"),
    ...parseDependencies(raw, "optionalDependencies", "optional"),
  ]);
}

function parseDependencies(
  raw: RawPackage,
  key:
    | "dependencies"
    | "devDependencies"
    | "peerDependencies"
    | "optionalDependencies",
  kind: DependencyType
): Dependency[] {
  const deps = raw.get(key, { default: {} as Record<string, string> });

  return Object.entries(deps).map(([name, version]) => {
    return new Dependency(kind, name, version);
  });
}
