import { isAbsolute, relative } from "node:path";

import type { Path, PathLike } from "./paths/abstract.js";
import { Directory } from "./paths/directory.js";
import type { Glob, GlobOptions, Globs } from "./paths/glob.js";
import type { RegularFile } from "./paths/regular.js";
import {
  type FILE_TYPES,
  type FileType,
  RUNTIME,
  type Runtime,
} from "./runtime.js";

/**
 * This interface represents the data that is shared between all path types for
 * a given workspace.
 */
export interface WorkspacePathData {
  readonly runtime: Runtime;
  /**
   * The workspace root is the directory that all path display is relative to,
   * unless an absolute path is explicitly requested.
   */
  readonly root: string;
}

export interface PathData {
  /**
   * The path root is the current directory that `relative` paths are relative to.
   *
   * For example, if you are using this library to model an npm workspace, the
   * workspace root is the root of the entire repository, and the path root is
   * the root of the package.
   *
   * If you are using this library to model a monorepo, the workspace root is
   * the root of the monorepo and the path root is the root of the directory
   * that the path is referencing.
   */
  readonly root: string;

  /**
   * The absolute path. It must be contained within the root.
   */
  readonly absolute: string;

  /**
   * A strict path disallows navigation outside of the root.
   *
   * If `strict` is `true`, then the path is a strict path, and navigation is
   * restricted to the current root. If `strict` is `undefined` or `false`, then
   * the unrestricted navigation is allowed.
   *
   * Non-strict navigation results in one of three possible roots:
   *
   * 1. The current root: if the path is contained within the current root, then
   *    the navigated path also has the current root.
   * 2. The workspace root: if the path is not contained within the current
   *    root, but it is contained within the workspace root, then the navigated
   *    path has the workspace root as its root.
   * 3. The system root (`/`): otherwise, the navigated path has the system root
   *    as its root.
   */
  readonly strict?: boolean | undefined;
}

export interface PathConstructor<P extends Path> {
  new (workspace: WorkspacePath, data: PathData): P;
}

export type IntoPathConstructor = PathConstructor<Path> | FileType;
export type PathConstructorFor<I extends IntoPathConstructor> =
  I extends PathConstructor<Path>
    ? I
    : I extends keyof FILE_TYPES
    ? FILE_TYPES[I]
    : never;
export type PathFor<I extends IntoPathConstructor> =
  PathConstructorFor<I> extends PathConstructor<infer P> ? P : never;

export class WorkspacePath implements PathLike {
  static at(root: string): WorkspacePath {
    return new WorkspacePath({ runtime: RUNTIME, root });
  }

  static get system(): WorkspacePath {
    return WorkspacePath.at("/");
  }

  readonly #workspace: WorkspacePathData;

  private constructor(workspace: WorkspacePathData) {
    this.#workspace = workspace;
  }

  get root(): Directory {
    return this.runtime.Directory.root(this);
  }

  get absolute(): string {
    return this.#workspace.root;
  }

  /**
   * @internal
   */
  get runtime(): Runtime {
    return this.#workspace.runtime;
  }

  get workspaceRoot(): Directory {
    return this.runtime.Directory.root(this);
  }

  /**
   * Create a new Directory nested under the workspace root. The new Directory
   * has the current workspace root as its workspace root.
   *
   * If `{ as: "root" }` is passed, the path is a new root under this workspace
   * root.
   *
   * If `{ as: "root" }` is not passed, the path's root is also the workspace
   * root.
   */
  dir(path: string, options?: { as: "root" }): Directory {
    if (options?.as === "root") {
      return this.#rootDir(path);
    } else {
      return this.workspaceRoot.dir(path);
    }
  }

  file(path: string): RegularFile {
    return this.workspaceRoot.file(path);
  }

  globs(options: GlobOptions<["files"]>): Globs<RegularFile>;
  globs(options: GlobOptions<["directories"]>): Globs<Directory>;
  globs(options?: GlobOptions): Globs;
  globs(options?: GlobOptions): Globs {
    return this.root.globs(options);
  }

  glob(path: string, options: GlobOptions<["files"]>): Glob<RegularFile>;
  glob(path: string, options: GlobOptions<["directories"]>): Glob<Directory>;
  glob(path: string, options?: GlobOptions): Glob;
  glob(path: string, options?: GlobOptions): Glob {
    return this.root.glob(path, options);
  }

  get demos(): Directory {
    return this.workspaceRoot.dir("demos");
  }

  create<P extends Path>(constructor: PathConstructor<P>, data: PathData): P {
    return new constructor(this, data);
  }

  demo(name: string): Directory {
    return this.demos.dir(name);
  }

  #rootDir(name: string): Directory {
    if (isAbsolute(name)) {
      // if the path is not contained in the root, error
      if (isAbsolute(relative(this.workspaceRoot.absolute, name))) {
        throw new Error("Path is not contained in the root");
      }
      return Directory.rooted(this, name);
    } else {
      return Directory.rooted(this, this.workspaceRoot.dir(name).absolute);
    }
  }
}
