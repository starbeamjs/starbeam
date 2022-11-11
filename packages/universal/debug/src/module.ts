import { isPresentString } from "@starbeam/core-utils";
import type * as interfaces from "@starbeam/interfaces";
import { hasType } from "@starbeam/verify";

import { inspector } from "./inspect/inspect-support.js";

export function describeModule(module: string): DescribedModule {
  return new DescribedModule(parse(module));
}

export interface DisplayRoot {
  name?: string;
  prefix: string;
}

export class DisplayPathParts {
  readonly #path: string;
  readonly #root: DisplayRoot | undefined;

  constructor({ path, root }: { path: string; root?: DisplayRoot }) {
    this.#path = path;
    this.#root = root;
  }

  finish(options: { action?: string; loc?: Loc } = {}): DisplayParts {
    return new DisplayParts({ path: this.#path, root: this.#root, ...options });
  }
}

export class DisplayParts implements interfaces.DisplayParts {
  readonly #action: string | undefined;
  readonly #loc: Loc | undefined;
  readonly #path: string;
  readonly #root: DisplayRoot | undefined;

  static {
    inspector(this, "DisplayParts").define((parts, debug) =>
      debug.struct({
        path: parts.#path,
        root: parts.#root,
        action: parts.#action,
        loc: parts.#loc,
      })
    );
  }

  constructor({
    path,
    root,
    action,
    loc,
  }: {
    path: string;
    root?: DisplayRoot | undefined;
    action?: string | undefined;
    loc?: Loc | undefined;
  }) {
    this.#path = path;
    this.#root = root;
    this.#action = action;
    this.#loc = loc;
  }

  get action(): string | undefined {
    return this.#action;
  }

  get #displayPath(): string {
    if (this.#root?.name) {
      return `[${this.#root.name}]/${this.#path}`;
    } else {
      return this.#path;
    }
  }

  get loc(): Loc | undefined {
    return this.#loc;
  }

  get path(): string {
    return this.#path;
  }

  get root(): DisplayRoot | undefined {
    return this.#root;
  }

  display(): string {
    if (this.#loc && this.#action) {
      return `${this.#action} (${this.#displayPath}:${formatLoc(this.#loc)})`;
    } else if (this.#loc) {
      return `${this.#displayPath}:${formatLoc(this.#loc)}`;
    } else if (this.#action) {
      return `${this.#action} (${this.#displayPath})`;
    } else {
      return this.#displayPath;
    }
  }
}

export class DescribedModule {
  #module: DescribedModulePath | DescribedPackage;

  constructor(module: DescribedModulePath | DescribedPackage) {
    this.#module = module;
  }

  display(
    location?: { loc?: Loc | undefined; action?: string | undefined },
    options: interfaces.StackFrameDisplayOptions = {}
  ): string {
    return this.parts(location, options).display();
  }

  parts(
    location?: { loc?: Loc | undefined; action?: string | undefined },
    options: interfaces.StackFrameDisplayOptions = {}
  ): DisplayParts {
    const parts = this.#module.parts(options);

    if (location === undefined) {
      return parts.finish();
    }

    const { loc, action } = location;

    const hasLoc = loc !== undefined;
    const hasAction = isPresentString(action);

    if (hasLoc && hasAction) {
      return parts.finish({ action, loc });
    } else if (hasLoc) {
      return parts.finish({ loc });
    } else if (hasAction) {
      return parts.finish({ action });
    }

    return parts.finish();
  }
}

interface Loc {
  line: number;
  column?: number | undefined;
}

function formatLoc(loc: Loc): string {
  if (loc.column === undefined) {
    return `${loc.line}`;
  } else {
    return `${loc.line}:${loc.column}`;
  }
}

interface DescribedPath {
  // path(options?: StackFrameDisplayOptions): string;
  parts: (options?: interfaces.StackFrameDisplayOptions) => DisplayPathParts;
}

class DescribedModulePath implements DescribedPath {
  readonly #path: string;
  readonly pkg = null;
  readonly type = "relative";

  constructor(path: string) {
    this.#path = path;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return `DescribedModulePath(${this.#path})`;
  }

  parts(options?: interfaces.StackFrameDisplayOptions): DisplayPathParts {
    return relative({ ...options, full: normalize(this.#path) });
  }
}

class DescribedPackage implements DescribedPath {
  readonly #name: string;
  readonly #path: string;
  readonly #scope: string | undefined;
  readonly type = "package";

  constructor(scope: string, name: string, path: string) {
    this.#scope = scope;
    this.#name = name;
    this.#path = path;
  }

  get #fullPath(): string {
    const parts: string[] = [];

    if (this.#scope) {
      parts.push(this.#scope);
    }

    parts.push(this.#name);

    if (this.#path) {
      parts.push(this.#path);
    }

    return normalize(...parts);
  }

  get pkg(): string {
    return normalize(this.#scope, this.#name);
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    const path = this.#path ? ` at ${this.#path}` : "";

    if (this.#scope) {
      return `DescribedPackage(${this.#scope}/${this.#name}${path})`;
    } else {
      return `DescribedPackage(${this.#name}${path})`;
    }
  }

  parts(): DisplayPathParts {
    return new DisplayPathParts({ path: this.#fullPath });
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

  const { scope, name, path } = groups as {
    scope: string;
    name: string;
    path: string;
  };

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
  roots,
  full,
}: {
  root?: string;
  roots?: Record<string, string>;
  full: string;
}): DisplayPathParts {
  if (root && full.startsWith(root)) {
    const path = full.slice(root.length);
    const rel = path.startsWith("/") ? path.slice("/".length) : path;
    return new DisplayPathParts({ root: { prefix: root }, path: rel });
  } else if (roots) {
    for (const [key, value] of Object.entries(roots)) {
      if (full.startsWith(value)) {
        const path = full.slice(value.length);
        const r = path.startsWith("/") ? path.slice("/".length) : path;
        return new DisplayPathParts({
          root: { name: key, prefix: value },
          path: r,
        });
      }
    }
  }

  return new DisplayPathParts({ path: full });
}
