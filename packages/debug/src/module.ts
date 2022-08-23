import type { StackFrameDisplayOptions } from "@starbeam/interfaces";
import { hasType } from "@starbeam/verify";

export function describeModule(module: string): DescribedModule {
  return new DescribedModule(parse(module));
}

export class DescribedModule {
  #module: DescribedModulePath | DescribedPackage;

  constructor(module: DescribedModulePath | DescribedPackage) {
    this.#module = module;
  }

  #simple(options: StackFrameDisplayOptions) {
    return `${this.#module.path(options)}`;
  }

  display(
    location?: { loc?: Loc; action?: string },
    options: StackFrameDisplayOptions = {}
  ): string {
    if (location === undefined) {
      return this.#simple(options);
    }

    const { loc, action } = location;

    const hasLoc = loc !== undefined;
    const hasAction = action !== undefined && action.trim().length !== 0;

    if (hasLoc && hasAction) {
      return `${action} (${this.#module.path(options)}:${formatLoc(loc)})`;
    } else if (hasLoc) {
      return `${this.#module.path(options)}:${formatLoc(loc)}`;
    } else if (hasAction) {
      return `${action} (${this.#module.path(options)})`;
    } else {
      return this.#simple(options);
    }
  }
}

interface Loc {
  line: number;
  column?: number;
}

function formatLoc(loc: Loc) {
  if (loc.column === undefined) {
    return `${loc.line}`;
  } else {
    return `${loc.line}:${loc.column}`;
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

  path(options?: StackFrameDisplayOptions): string {
    return relative({ root: options?.root, full: normalize(this.#path) });
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
    return normalize(this.#scope, this.#name);
  }

  path(options?: StackFrameDisplayOptions): string {
    return relative({ root: options?.root, full: this.#path });
  }
}

const SOURCE_PARTS =
  /^(?![a-z]+:)(?:(?<scope>@[^/\\]+)[/])?(?<name>[^/\\]+)(?:[/\\](?<path>.*))?$/;

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
function normalize(...pathParts: (string | null | undefined)[]): string {
  return pathParts
    .filter(hasType("string"))
    .map((p: string) => p.replaceAll(/[\\]/g, "/"))
    .join("/");
}

function relative({
  root,
  full,
}: {
  root: string | undefined;
  full: string;
}): string {
  if (root && full.startsWith(root)) {
    return full.slice(root.length);
  } else {
    return full;
  }
}
