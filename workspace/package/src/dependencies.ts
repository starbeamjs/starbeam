import { nullifyEmptyArray } from "@starbeam/core-utils";
import type { IntoUnion } from "@starbeam-workspace/shared";

import type { RawPackage } from "./raw-package";
import { DependencyType } from "./unions.js";

export function parseDependencies(
  raw: RawPackage,
  key:
    | "dependencies"
    | "devDependencies"
    | "peerDependencies"
    | "optionalDependencies",
  kind: DependencyType,
): Dependencies {
  const rawDeps = raw.get(key, { default: {} as Record<string, string> });

  const dependencies = Object.entries(rawDeps).map(([name, version]) => {
    return new Dependency(kind, name, version);
  });

  return new Dependencies(dependencies);
}

export function createDependencies(raw: RawPackage): PackageDependencies {
  return new PackageDependencies({
    development: parseDependencies(
      raw,
      "devDependencies",
      DependencyType.development,
    ),
    runtime: parseDependencies(raw, "dependencies", DependencyType.runtime),
    optional: parseDependencies(
      raw,
      "optionalDependencies",
      DependencyType.optional,
    ),
    peer: parseDependencies(raw, "peerDependencies", DependencyType.peer),
  });
}

interface PackageDependenciesInfo {
  development: Dependencies;
  runtime: Dependencies;
  optional: Dependencies;
  peer: Dependencies;
}

export class PackageDependencies {
  readonly #deps: PackageDependenciesInfo;

  constructor(deps: PackageDependenciesInfo) {
    this.#deps = deps;
  }

  has(name: string, type?: IntoUnion<DependencyType>): boolean {
    if (type === undefined) {
      return (
        this.has(name, DependencyType.runtime) ||
        this.has(name, DependencyType.development) ||
        this.has(name, DependencyType.optional) ||
        this.has(name, DependencyType.peer)
      );
    }

    return this.#deps[DependencyType.asString(type)].has(name);
  }

  getAll(name: string): Dependency[] | null {
    return nullifyEmptyArray(
      (["runtime", "development", "optional", "peer"] as const).flatMap(
        (type) => {
          const dep = this.get(name, DependencyType.of(type));
          return dep ? [dep] : [];
        },
      ),
    );
  }

  get(name: string, type?: IntoUnion<DependencyType>): Dependency | undefined {
    if (type === undefined) {
      return (
        this.get(name, DependencyType.runtime) ||
        this.get(name, DependencyType.development) ||
        this.get(name, DependencyType.optional) ||
        this.get(name, DependencyType.peer)
      );
    }

    return this.#deps[DependencyType.asString(type)].get(name);
  }

  get development(): Dependencies {
    return this.#deps.development;
  }

  get runtime(): Dependencies {
    return this.#deps.runtime;
  }

  get optional(): Dependencies {
    return this.#deps.optional;
  }

  get peer(): Dependencies {
    return this.#deps.peer;
  }
}

export class Dependencies {
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

export class Dependency {
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
