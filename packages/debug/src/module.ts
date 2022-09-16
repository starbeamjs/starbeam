import type * as interfaces from "@starbeam/interfaces";
import { hasType } from "@starbeam/verify";

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
  readonly #path: string;
  readonly #root: DisplayRoot | undefined;
  readonly #action: string | undefined;
  readonly #loc: Loc | undefined;

  constructor({
    path,
    root,
    action,
    loc,
  }: {
    path: string;
    root?: DisplayRoot;
    action?: string;
    loc?: Loc;
  }) {
    this.#path = path;
    this.#root = root;
    this.#action = action;
    this.#loc = loc;
  }

  get path(): string {
    return this.#path;
  }

  get root(): DisplayRoot | undefined {
    return this.#root;
  }

  get action(): string | undefined {
    return this.#action;
  }

  get loc(): Loc | undefined {
    return this.#loc;
  }

  get #displayPath() {
    if (this.#root?.name) {
      return `[${this.#root.name}]/${this.#path}`;
    } else {
      return this.#path;
    }
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

  parts(
    location?: { loc?: Loc; action?: string },
    options: interfaces.StackFrameDisplayOptions = {}
  ): DisplayParts {
    const parts = this.#module.parts(options);

    if (location === undefined) {
      return parts.finish();
    }

    const { loc, action } = location;

    const hasLoc = loc !== undefined;
    const hasAction = action !== undefined && action.trim().length !== 0;

    if (hasLoc && hasAction) {
      return parts.finish({ action, loc });
    } else if (hasLoc) {
      return parts.finish({ loc });
    } else if (hasAction) {
      return parts.finish({ action });
    }

    return parts.finish();
  }

  display(
    location?: { loc?: Loc; action?: string },
    options: interfaces.StackFrameDisplayOptions = {}
  ): string {
    return this.parts(location, options).display();
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

interface DescribedPath {
  // path(options?: StackFrameDisplayOptions): string;
  parts(options?: interfaces.StackFrameDisplayOptions): DisplayPathParts;
}

class DescribedModulePath implements DescribedPath {
  readonly type = "relative";
  readonly #path: string;

  constructor(path: string) {
    this.#path = path;
  }

  get pkg() {
    return null;
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `DescribedModulePath(${this.#path})`;
  }

  parts(options?: interfaces.StackFrameDisplayOptions): DisplayPathParts {
    return relative({ ...options, full: normalize(this.#path) });
  }
}

class DescribedPackage implements DescribedPath {
  readonly type = "package";
  readonly #scope: string | undefined;
  readonly #name: string;
  readonly #path: string;

  constructor(scope: string, name: string, path: string) {
    this.#scope = scope;
    this.#name = name;
    this.#path = path;
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    const path = this.#path ? ` at ${this.#path}` : "";

    if (this.#scope) {
      return `DescribedPackage(${this.#scope}/${this.#name}${path})`;
    } else {
      return `DescribedPackage(${this.#name}${path})`;
    }
  }

  get pkg() {
    return normalize(this.#scope, this.#name);
  }

  parts(): DisplayPathParts {
    return new DisplayPathParts({ path: this.#fullPath });
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
  roots,
  full,
}: {
  root?: string;
  roots?: Record<string, string>;
  full: string;
}): DisplayPathParts {
  if (root && full.startsWith(root)) {
    const path = full.slice(root.length);
    const relative = path.startsWith("/") ? path.slice(1) : path;
    return new DisplayPathParts({ root: { prefix: root }, path: relative });
  } else if (roots) {
    for (const [key, value] of Object.entries(roots)) {
      if (full.startsWith(value)) {
        const path = full.slice(value.length);
        const relative = path.startsWith("/") ? path.slice(1) : path;
        return new DisplayPathParts({
          root: { name: key, prefix: value },
          path: relative,
        });
      }
    }
  }

  return new DisplayPathParts({ path: full });
}
