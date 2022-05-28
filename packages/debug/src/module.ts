import { hasType } from "@starbeam/verify";

export function describeModule(module: string): DescribedModule {
  return new DescribedModule(parse(module));
}

export class DescribedModule {
  #module: DescribedModulePath | DescribedPackage;

  constructor(module: DescribedModulePath | DescribedPackage) {
    this.#module = module;
  }

  get #simple() {
    return `at ${this.#module.path}`;
  }

  display(location?: {
    loc?: { line: number; column: number };
    action?: string;
  }): string {
    if (location === undefined) {
      return this.#simple;
    }

    const { loc, action } = location;

    const hasLoc = loc !== undefined;
    const hasAction = action !== undefined;

    if (hasLoc && hasAction) {
      return `at ${action} (${this.#module.path}:${loc.line}:${loc.column})`;
    } else if (hasLoc) {
      return `at ${this.#module.path}:${loc.line}:${loc.column}`;
    } else if (hasAction) {
      return `at ${action} (${this.#module.path})`;
    } else {
      return this.#simple;
    }
  }
}

class DescribedModulePath {
  readonly type = "relative";
  readonly #path: string;

  constructor(path: string) {
    this.#path = path;
  }

  get pkg() {
    return null;
  }

  get path() {
    return this.localPath;
  }

  get localPath() {
    return join(this.#path);
  }
}

class DescribedPackage {
  readonly type = "package";
  readonly #scope: string | undefined;
  readonly #name: string;
  readonly #path: string;

  constructor(scope: string, name: string, path: string) {
    this.#scope = scope;
    this.#name = name;
    this.#path = path;
  }

  get pkg() {
    return join(this.#scope, this.#name);
  }

  get path() {
    return join(this.#scope, this.#name, this.#path);
  }

  get localPath() {
    return this.#path;
  }
}

const SOURCE_PARTS =
  /^(?:(?<scope>@[^/\\]+)[/])?(?<name>[^/\\]+)(?:[/\\](?<path>.*))?$/;

function parse(module: string): DescribedModulePath | DescribedPackage {
  if (module.startsWith(".") || module.startsWith("/")) {
    return new DescribedModulePath(module);
  }

  const groups = SOURCE_PARTS.exec(module)?.groups;

  if (groups === undefined) {
    return new DescribedModulePath(module);
  }

  const { scope, name, path } = groups;

  return new DescribedPackage(scope, name, path);
}

/**
 * The whole `Stack` system is only intended to be used for logging, so the
 * edge-cases where this normalization wouldn't work (verbatim paths on Windows)
 * shouldn't matter.
 */
function join(...pathParts: (string | null | undefined)[]): string {
  return pathParts
    .filter(hasType("string"))
    .map((p: string) => p.replaceAll(/[\\]/g, "/"))
    .join("/");
}
