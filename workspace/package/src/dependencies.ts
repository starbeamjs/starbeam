import type { RawPackage } from "./raw-package";

export function parseDependencies(
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

export function createDependencies(raw: RawPackage): Dependencies {
  return new Dependencies([
    ...parseDependencies(raw, "dependencies", "normal"),
    ...parseDependencies(raw, "devDependencies", "dev"),
    ...parseDependencies(raw, "peerDependencies", "peer"),
    ...parseDependencies(raw, "optionalDependencies", "optional"),
  ]);
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

export type DependencyType = "normal" | "dev" | "peer" | "optional";

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
