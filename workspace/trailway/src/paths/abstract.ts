import { basename, dirname, relative } from "node:path";
import { pathToFileURL } from "node:url";

import { Display, StyleName, TO_STRING } from "@starbeam/core-utils";

import {
  Navigation,
  NavigationError,
  ProblemSegment,
  StrictNavigationError,
} from "../error.js";
import type { FileType, Runtime } from "../runtime.js";
import { isContained, nullifyEmpty, resolve } from "../utils.js";
import type {
  IntoPathConstructor,
  PathConstructor,
  PathData,
  PathFor,
  WorkspacePath,
} from "../workspace.js";
import type { Directory } from "./directory.js";
import type { Glob, GlobOptions, Globs } from "./glob.js";
import type { RegularFile } from "./regular.js";
import type { UnknownFile } from "./unknown.js";

export interface PathLike {
  readonly root: Directory;
  readonly absolute: string;
}

export interface DirLike extends PathLike {
  readonly dir: (path: string, options?: { as: "root" }) => Directory;
  readonly file: (path: string) => RegularFile;
  readonly join: (path: string) => UnknownFile;

  readonly globs: ((options: GlobOptions<["files"]>) => Globs<RegularFile>) &
    ((options: GlobOptions<["directories"]>) => Globs<Directory>) &
    ((options?: GlobOptions) => Globs);

  readonly glob: ((
    path: string,
    options: GlobOptions<["files"]>,
  ) => Glob<RegularFile>) &
    ((path: string, options: GlobOptions<["directories"]>) => Glob<Directory>) &
    ((path: string, options?: GlobOptions) => Glob);
}

export type IntoPathLike = PathLike | string;

export function getAbsolute(path: IntoPathLike): string {
  return typeof path === "string" ? path : path.absolute;
}

export abstract class Path extends URL implements PathLike {
  static create<P extends Path>(
    this: PathConstructor<P>,
    workspace: WorkspacePath,
    data: PathData,
  ): P {
    return new this(workspace, data);
  }

  static isRoot(path: Path): boolean {
    return path.#absolutePath === path.#root;
  }

  declare [TO_STRING]: true;
  abstract create(data: PathData): Path;
  abstract readonly [Symbol.toStringTag]: string;

  readonly #workspace: WorkspacePath;
  readonly #data: PathData;

  /** @internal */
  constructor(workspace: WorkspacePath, path: PathData) {
    super(pathToFileURL(path.absolute));
    this.#workspace = workspace;
    this.#data = path;
  }

  get #root(): string {
    return this.#data.root;
  }

  get #absolutePath(): string {
    return this.#data.absolute;
  }

  /**
   * By default, a path's `toString` method returns the absolute path.
   *
   * If `{ display: true }` is passed, the path's `toString` method returns
   * a human-readable representation of the path. It looks similar to the output
   * of `util.inspect`, but is never styled.
   */
  override toString(
    options?:
      | undefined
      | { as: "display" }
      | { as: "description"; verbose?: boolean },
  ): string {
    if (options === undefined) {
      return this.absolute;
    }

    switch (options.as) {
      case "display":
        return this.#display();

      case "description":
        return this.#describe(options.verbose);
    }
  }

  #display(): string {
    const relative = this.relative;

    if (relative === undefined) {
      return `${this[Symbol.toStringTag]}[root](${this.relativeFromWorkspace})`;
    } else {
      return `${
        this[Symbol.toStringTag]
      }(${relative} from ${this.#workspaceRoot.navigateTo(this.#root)})`;
    }
  }

  #describe(verbose: boolean | undefined): string {
    const relative = this.relative;
    const fromWorkspace = this.relativeFromWorkspace;

    if (relative) {
      const rootFromWorkspace = this.root.relativeFromWorkspace;
      return rootFromWorkspace
        ? `${relative} in ${this.root.relativeFromWorkspace}`
        : relative;
    } else if (fromWorkspace) {
      return verbose
        ? `${fromWorkspace} in ${this.#absolutePath}`
        : fromWorkspace;
    } else {
      const workspaceDesc = "the workspace root";

      return verbose
        ? `${workspaceDesc} (${this.#absolutePath})`
        : workspaceDesc;
    }
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    const relative = this.relative;

    if (relative === undefined) {
      return Display({
        name: this[Symbol.toStringTag],
        format: (stylize) =>
          stylize(this.relativeFromWorkspace, StyleName["id:module"]),
        description: "root",
      });
    } else {
      return Display({
        name: this[Symbol.toStringTag],
        format: (stylize) => stylize(relative, StyleName["id:module"]),
        annotation: `from ${this.#workspaceRoot.navigateTo(this.#root)}`,
      });
    }
  }

  strict(): ReturnType<this["create"]> {
    return this.create({ ...this.#data, strict: true }) as ReturnType<
      this["create"]
    >;
  }

  build<I extends IntoPathConstructor>(type: I, data: PathData): PathFor<I> {
    const Class =
      typeof type === "object" ? type : this.#runtime[type as FileType];

    return new Class(this.#workspace, {
      strict: this.#data.strict,
      ...data,
    }) as unknown as PathFor<I>;
  }

  get workspace(): WorkspacePath {
    return this.#workspace;
  }

  /**
   * Normalize the path data so that its path is contained within its root.
   *
   * 1. If the path is contained within the current root, return a PathData
   *    that is relative to the current root.
   * 2. If the path is contained within the workspace root, return a PathData
   *    that is relative to the workspace root.
   * 3. Otherwise, the path is relative to the system root.
   */
  #navigateTo(absolute: string, navigation: Navigation): PathData {
    // If the absolute path is contained within the current root, return a
    // PathData that is relative to the current root.
    if (isContained(this.#root, absolute))
      return {
        root: this.#root,
        absolute,
      };

    if (this.#data.strict) {
      throw new StrictNavigationError(navigation, this, absolute);
    }

    const workspaceRoot = this.#workspace.absolute;

    // If the absolute path is contained within the workspace root, update the
    // data to be relative to the workspace root.
    if (isContained(workspaceRoot, absolute)) {
      return {
        root: workspaceRoot,
        absolute,
      };
    }

    // Otherwise, the path is relative to the system root.
    return {
      root: this.#runtime.systemRoot.absolute,
      absolute,
    };
  }

  rootTo(path: Path): ReturnType<this["create"]> {
    return this.create({
      root: path.absolute,
      absolute: this.#absolutePath,
    }) as ReturnType<this["create"]>;
  }

  /**
   * Create a new Path from an absolute path. The new path will be rooted to this path.
   */
  rootedChild(path: Path | string): ReturnType<this["create"]> {
    const absolutePath = typeof path === "string" ? path : path.absolute;
    return this.create({
      root: this.#absolutePath,
      absolute: absolutePath,
    }) as ReturnType<this["create"]>;
  }

  /**
   * Returns this path, relative to the current root.
   *
   * If this path is the same as the current root, `relative` returns
   * `undefined`.
   */
  get relative(): string | undefined {
    return nullifyEmpty(relative(this.#root, this.#absolutePath));
  }

  /**
   * The path relative to the workspace root.
   *
   * If this path is the same as the workspace root, `relativeFromWorkspace`
   * returns `undefined` (like {@linkcode Path.relative}).
   *
   */
  get relativeFromWorkspace(): string {
    return relative(this.#workspaceRoot.absolute, this.#absolutePath);
  }

  get absolute(): string {
    return this.#absolutePath;
  }

  get #workspaceRoot(): Directory {
    return this.#runtime.Directory.root(this.#workspace);
  }

  get #runtime(): Runtime {
    return this.#workspace.runtime;
  }

  /**
   * The root directory is an ancestor of this path. By default, the root
   * directory is not included when displaying a path.
   */
  get root(): Directory {
    return this.#runtime.Directory.rooted(this.#workspace, this.#root);
  }

  get dirname(): string {
    return dirname(this.#absolutePath);
  }

  get basename(): string {
    return basename(this.#absolutePath);
  }

  get parent(): Directory {
    return this.build(
      "Directory",
      this.#navigateTo(this.dirname, Navigation.Parent),
    );
  }

  /**
   * Returns a relative path that can be used to navigate from the specified
   * path to the current path.
   */
  navigateFrom(path: IntoPathLike, options?: { dotPrefix: boolean }): string {
    const relativePath = relative(getAbsolute(path), this.#absolutePath);
    return prefix(relativePath, options);
  }

  /**
   * Returns a relative path that can be used to navigate from the current
   * directory to the given path.
   *
   * If the target path is contained within the current path, the return
   * path will not start with `./` unless `{ dotPrefix: true }` is passed.
   */
  navigateTo(path: IntoPathLike, options?: { dotPrefix: boolean }): string {
    const relativePath = relative(this.#absolutePath, getAbsolute(path));
    return prefix(relativePath, options);
  }

  dir(path: string, options?: { as: "root" }): Directory | Glob<Directory> {
    const absolute = resolve(
      this.#absolutePath,
      this.#validateDescendant(path, Navigation.Dir),
    );

    return this.build("Directory", {
      root: options?.as === "root" ? absolute : this.#root,
      absolute: absolute,
    });
  }

  file(path: string): RegularFile | Glob<RegularFile> {
    return this.build("RegularFile", {
      root: this.#root,
      absolute: resolve(
        this.#absolutePath,
        this.#validateDescendant(path, Navigation.File),
      ),
    });
  }

  join(path: string): Path {
    return this.build("UnknownFile", {
      root: this.#root,
      absolute: resolve(this.#absolutePath, path),
    });
  }

  glob(path: string, options: GlobOptions<["files"]>): Glob<RegularFile>;
  glob(path: string, options: GlobOptions<["directories"]>): Glob<Directory>;
  glob(path: string, options?: GlobOptions): Glob;
  glob(path: string, options?: GlobOptions): Glob {
    const relative = this.#validateDescendant(path, Navigation.Glob);

    return this.#runtime.Glob.matching(
      this.#workspace,
      {
        root: this.#root,
        absolute: resolve(this.#absolutePath, relative),
      },
      options,
    );
  }

  #validateDescendant(path: string, navigation: Navigation): string {
    if (path.includes("..")) {
      throw new NavigationError(
        {
          navigation: Navigation.Glob,
          problem: path.startsWith("..")
            ? ProblemSegment.LeadingAncestor
            : ProblemSegment.InteriorAncestor,
        },
        this,
        path,
      );
    }

    if (path.startsWith("/")) {
      if (isContained(this.absolute, path)) return this.navigateTo(path);

      if (!isContained(this.absolute, path)) {
        throw new NavigationError(
          {
            navigation,
            problem: ProblemSegment.Absolute,
          },
          this,
          path,
        );
      }
    }

    return path;
  }
}

function prefix(path: string, options?: { dotPrefix: boolean }): string {
  if (options?.dotPrefix) {
    return path.startsWith(".") ? path : `./${path}`;
  } else {
    return path;
  }
}
