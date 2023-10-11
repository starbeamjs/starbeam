import {
  DisplayNewtype,
  isPresentArray,
  stringify,
} from "@starbeam/core-utils";
import glob, { type Entry } from "fast-glob";

import {
  classify,
  type GlobMatch,
  includeOptions,
  isArray,
  resolve,
} from "../utils.js";
import type {
  IntoPathConstructor,
  PathData,
  WorkspacePath,
} from "../workspace.js";
import { Path } from "./abstract.js";
import type { Directory } from "./directory.js";
import type { RegularFile } from "./regular.js";

export interface GlobOptions<M extends GlobMatch[] = GlobMatch[]> {
  allow?: GlobAllow[];
  match?: M;
  as?: "root";
}

export type FileForGlobOptions<O extends GlobOptions> = O extends GlobOptions<
  infer M
>
  ? FileForMatch<M[number]>
  : never;
type FileForMatch<M extends GlobMatch> = M extends "files"
  ? RegularFile
  : Directory;

export type GlobFormat<T extends Path> =
  | "absolute"
  | "absolute:quoted"
  | "relative"
  | "relative:quoted"
  | ((input: Glob<T>) => string);

export type GlobAllow = "symlink" | "hidden";

export class Glob<T extends Path = Path> extends Path {
  static files(workspace: WorkspacePath, data: PathData): Glob<RegularFile> {
    return new Glob(workspace, data, { match: ["files"] });
  }

  static dirs(workspace: WorkspacePath, data: PathData): Glob<Directory> {
    return new Glob(workspace, data, { match: ["directories"] });
  }

  static any(
    workspace: WorkspacePath,
    data: PathData,
  ): Glob<Directory | RegularFile> {
    return new Glob(workspace, data, { match: ["files", "directories"] });
  }

  static matching<O extends GlobOptions = GlobOptions>(
    workspace: WorkspacePath,
    data: PathData,
    options?: O,
  ): Glob<FileForGlobOptions<O>> {
    return new Glob(workspace, data, options) as Glob<FileForGlobOptions<O>>;
  }

  static options(glob: Glob): GlobOptions {
    return glob.#options;
  }

  static isMatch<G extends GlobOptions>(
    glob: Glob,
    options?: G | undefined,
  ): boolean {
    const globMatches = glob.#options.match;
    const expectedMatches = options?.match;

    if (globMatches === undefined && expectedMatches === undefined) {
      return true;
    }

    if (Array.isArray(globMatches) && Array.isArray(expectedMatches)) {
      if (globMatches.length !== expectedMatches.length) {
        return false;
      }

      const actual = [...globMatches].sort();
      const expected = [...expectedMatches].sort();

      return JSON.stringify(actual) === JSON.stringify(expected);
    }

    return false;
  }

  #options: GlobOptions;

  constructor(
    workspace: WorkspacePath,
    data: PathData,
    options: GlobOptions = {},
  ) {
    super(workspace, data);
    this.#options = options;
  }

  readonly [Symbol.toStringTag] = "Glob";

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayNewtype("Glob", String(this), {
      annotation: this.#options as Record<string, string>,
    });
  }

  create(data: PathData): Glob {
    return new Glob(this.workspace, data, this.#options);
  }

  toGlobString(format: GlobFormat<T>): string {
    function normalizeFn(): (glob: Glob<T>) => string {
      switch (format) {
        case "absolute":
          return (g: Glob<T>) => g.absolute;
        case "absolute:quoted":
          return (g: Glob<T>) => `"${g.absolute}"`;
        case "relative":
          return (g: Glob<T>) => g.relative ?? "";
        case "relative:quoted":
          return (g: Glob<T>) => `"${g.relative}"`;
        default:
          return format;
      }
    }

    return normalizeFn()(this);
  }

  override join(path: string, options?: GlobOptions): Glob {
    return new Glob(
      this.workspace,
      { absolute: this.root.absolute, root: resolve(this.absolute, path) },
      {
        ...this.#options,
        ...options,
      },
    );
  }

  override file(path: string): Glob<RegularFile> {
    return this.join(path, { match: ["files"] }) as Glob<RegularFile>;
  }

  override dir(path: string): Glob<Directory> {
    return this.join(path, { match: ["directories"] }) as Glob<Directory>;
  }

  asGlobs(): Globs<T> {
    return Globs.root<T>(this.root, this.#options).add(this);
  }

  exists(): boolean {
    return isPresentArray(this.expand());
  }

  expand(): T[] {
    const options = this.#options;

    return glob
      .sync(this.absolute, {
        ...includeOptions(options),
        objectMode: true,
        absolute: true,
      })
      .flatMap((entry): T[] => {
        const dirent = entry.dirent;

        if (dirent.isDirectory()) {
          return this.#ifIncluded(entry, "Directory");
        } else if (dirent.isFile()) {
          return this.#ifIncluded(entry, "RegularFile");
        } else if (dirent.isSymbolicLink()) {
          // TODO
        } else {
          // eslint-disable-next-line no-console
          console.warn(
            stringify`glob pattern ${this} unexpectedly matched the ${classify(
              dirent,
            )} ${entry.path}`,
          );
        }

        return [];
      });
  }

  #entryData(path: string): PathData {
    return this.#options.as === "root"
      ? { root: path, absolute: path }
      : { root: this.root.absolute, absolute: path };
  }

  #ifIncluded<P extends Path>(entry: Entry, create: IntoPathConstructor): P[] {
    const options = this.#options;
    const data = this.#entryData(entry.path);

    if (options.match === undefined) {
      return [this.build(create, data) as P];
    } else if (options.match.includes("files") && entry.dirent.isFile()) {
      return [this.build(create, data) as P];
    } else if (
      options.match.includes("directories") &&
      entry.dirent.isDirectory()
    ) {
      return [this.build(create, data) as P];
    } else {
      return [];
    }
  }

  and(path: string): Globs;
  and(path: Glob<T>): Globs<T>;
  and(path: string | Glob, options?: GlobOptions): Globs {
    const globs = Globs.root(this.root, this.#options);

    globs.add(this);

    if (typeof path === "string") {
      globs.add(
        new this.workspace.runtime.Glob(
          this.workspace,
          {
            root: this.root.absolute,
            absolute: resolve(this.absolute, path),
          },
          options,
        ),
      );
    } else {
      globs.add(path);
    }

    return globs;
  }
}

export class Globs<T extends Path = Path> implements Iterable<Glob<T>> {
  static root(root: Path, options: GlobOptions<["files"]>): Globs<RegularFile>;
  static root(
    root: Path,
    options: GlobOptions<["directories"]>,
  ): Globs<Directory>;
  static root<T extends Path>(root: Path, options?: GlobOptions): Globs<T>;
  static root(root: Path, options?: GlobOptions): Globs {
    return new Globs(root.workspace, root, [], options);
  }

  readonly #workspace: WorkspacePath;
  readonly #root: Path;
  readonly #options: GlobOptions;
  readonly #globs: readonly Glob[];

  private constructor(
    workspace: WorkspacePath,
    root: Path,
    globs: Glob[],
    options: GlobOptions | undefined,
  ) {
    this.#workspace = workspace;
    this.#root = root;
    this.#globs = globs;
    this.#options = options ?? {};
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    if (this.#options.match) {
      return {
        globs: this.#globs.map((g) => g.absolute),
        files: this.#options.match.includes("files"),
        directories: this.#options.match.includes("directories"),
      };
    } else {
      return [...this.#globs];
    }
  }

  *[Symbol.iterator](): IterableIterator<Glob<T>> {
    yield* this.#globs as Glob<T>[];
  }

  asGlobs(): this {
    return this;
  }

  toGlobString(format: GlobFormat<T>, separator: string): string {
    return [...this].map((glob) => glob.toGlobString(format)).join(separator);
  }

  add(
    globs: Glob<T> | Globs<T> | readonly Glob<T>[] | string | readonly string[],
  ): Globs<T>;
  add(
    globs: readonly Glob[] | Globs | Glob | string | readonly string[],
  ): Globs {
    if (globs instanceof Globs) {
      return this.add(globs.#globs as readonly Glob<T>[]);
    } else if (isArray(globs)) {
      const addedGlobs = globs.map((glob) => this.#added(glob));
      const allGlobs = [...this.#globs, ...addedGlobs];
      return new Globs(this.#workspace, this.#root, allGlobs, this.#options);
    } else {
      const added = this.#added(globs);
      const allGlobs = [...this.#globs, added];
      return new Globs(this.#workspace, this.#root, allGlobs, this.#options);
    }
  }

  #added(glob: string | Glob): Glob {
    if (typeof glob === "string") {
      return Glob.matching(
        this.#workspace,
        {
          absolute: resolve(this.#root.absolute, glob),
          root: this.#root.absolute,
        },
        this.#options,
      );
    } else {
      if (glob.root.absolute !== this.#root.absolute) {
        return glob.rootTo(this.#root);
      }

      if (!Glob.isMatch(glob, this.#options)) {
        throw Error(
          `Attempting to add a glob to a collection with options ${JSON.stringify(
            this.#options,
          )}, but the glob had the options ${JSON.stringify(
            Glob.options(glob),
          )}`,
        );
      }

      return glob;
    }
  }

  expand(): T[] {
    return this.#globs.flatMap((glob) => glob.expand()) as T[];
  }
}
