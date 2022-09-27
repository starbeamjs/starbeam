import type { Directory, Path, RegularFile } from "./paths.js";
import { Query } from "./query.js";
import type { Workspace } from "./workspace.js";

export type StarbeamType =
  | "interfaces"
  | "library"
  | "support:tests"
  | "support:build"
  | "demo:react"
  | "unknown"
  | "draft";

export interface PackageInfo {
  manifest: Path;
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
  static from(this: void, manifest: RegularFile): Package {
    const pkg = manifest.readSync<Record<string, JsonValue>>({ as: "json" });

    if (pkg === null || typeof pkg !== "object") {
      throw Error(`Invalid package.json at ${manifest}`);
    }

    const root = manifest.dirname;
    const raw = new RawPackage(pkg, root);

    const main = raw.get("main", { default: undefined as undefined | string });

    return new Package({
      manifest,
      name: raw.get("name"),
      main,
      root,
      isPrivate: raw.get("private", { default: false }),
      isTypescript:
        !!raw.get("type", { default: undefined }) ||
        !!raw.get("exports:.:types", { default: undefined }) !== undefined,
      starbeam: {
        tsconfig: raw.get("starbeam:tsconfig", { default: undefined }),
        type: raw.get("starbeam:type", {
          default: main ? undefined : "unknown",
        }),
        used: raw.get("starbeam:used", { default: [] }),
      },
    });
  }

  constructor(readonly info: PackageInfo) {}

  get name(): string {
    return this.info.name;
  }

  get root(): Directory {
    return this.info.manifest.parent;
  }

  get isPrivate(): boolean {
    return this.info.isPrivate;
  }

  get isTypescript(): boolean {
    return this.info.isTypescript;
  }

  isSupport(kind: "tests" | "build"): boolean {
    return this.type === `support:${kind}`;
  }

  get tsconfig(): string | undefined {
    return this.info.starbeam.tsconfig;
  }

  get type(): StarbeamType | undefined {
    return this.info.starbeam.type;
  }

  get used(): Used[] {
    return this.info.starbeam.used;
  }

  get tests(): Directory {
    return this.root.dir("tests");
  }
}

export interface Used {
  reason: string;
  packages: string[];
}

export function queryPackages(
  workspace: Workspace,
  query: Query = Query.all
): Package[] {
  const packages = workspace.paths.packages.all;
  const tests = packages.dir("tests");
  const demos = workspace.paths.demos.glob("*", { match: ["directories"] });

  return workspace.root
    .globs({ match: ["files"] })
    .add([
      packages.file("package.json"),
      tests.file("package.json"),
      demos.file("package.json"),
    ])
    .expand()
    .map(Package.from)
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
