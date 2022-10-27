import {
  type Dirent,
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import {
  dirname,
  isAbsolute,
  relative,
  resolve as nodeResolve,
} from "node:path";
import { pathToFileURL } from "node:url";

import {
  objectHasKeys,
  stringify,
  stringifyJSON,
  TO_STRING,
} from "@starbeam/core-utils";
import glob, { type Entry, type Options } from "fast-glob";

import type { JsonObject } from "./json.js";

export class Paths {
  static root(root: string): Paths {
    if (isAbsolute(root)) {
      return new Paths(new Directory(root, root));
    } else {
      throw Error(`Root path must be absolute: ${root}`);
    }
  }

  readonly #root: Directory;

  private constructor(root: Directory) {
    this.#root = root;
  }

  get demos(): Directory {
    return this.#root.dir("demos");
  }

  demo(name: string): Directory {
    return this.demos.dir(name);
  }

  get root(): Directory {
    return this.#root;
  }

  get packages(): Packages {
    return new Packages(
      this.#root.absolute,
      this.#root.dir("packages").absolute
    );
  }
}

abstract class Path extends URL {
  static isRoot(path: Path): boolean {
    return path.#absolutePath === path.#root;
  }

  declare [TO_STRING]: true;

  readonly #root: string;
  readonly #absolutePath: string;

  constructor(root: string, absolutePath: string) {
    super(pathToFileURL(absolutePath));
    this.#root = root;
    this.#absolutePath = absolutePath;
  }

  abstract create(root: string, absolutePath: string): Path;

  // make interpolation do the expected thing
  override toString(): string {
    return this.absolute;
  }

  rootTo(path: Path): ReturnType<this["create"]> {
    return this.create(path.absolute, this.#absolutePath) as ReturnType<
      this["create"]
    >;
  }

  get relative(): string {
    return relative(this.#root, this.#absolutePath);
  }

  get absolute(): string {
    return this.#absolutePath;
  }

  /**
   * The root is a directory that its files are relative to.
   */
  get root(): Directory {
    return new Directory(this.#root, this.#root);
  }

  get dirname(): string {
    return dirname(this.#absolutePath);
  }

  get parent(): Directory {
    return new Directory(this.#root, this.dirname);
  }

  relativeFrom(
    path: Path | string,
    options: { dotPrefix: boolean } = { dotPrefix: false }
  ): string {
    const absolutePath = typeof path === "string" ? path : path.absolute;
    const relativePath = relative(absolutePath, this.#absolutePath);

    if (options.dotPrefix) {
      return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
    } else {
      return relativePath;
    }
  }

  relativeTo(
    path: Path | string,
    options: { dotPrefix: boolean } = { dotPrefix: false }
  ): string {
    const absolutePath = typeof path === "string" ? path : path.absolute;
    const relativePath = relative(this.#absolutePath, absolutePath);

    if (options.dotPrefix) {
      return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
    } else {
      return relativePath;
    }
  }

  dir(path: string): Directory | Glob<Directory> {
    return new Directory(this.#absolutePath, resolve(this.#absolutePath, path));
  }

  file(path: string): RegularFile | Glob<RegularFile> {
    return new RegularFile(
      this.#absolutePath,
      resolve(this.#absolutePath, path)
    );
  }

  join(path: string): Path {
    return new UnknownFile(this.#root, resolve(this.#absolutePath, path));
  }

  glob(path: string, options?: GlobOptions<["files"]>): Glob<RegularFile>;
  glob(path: string, options?: GlobOptions<["directories"]>): Glob<Directory>;
  glob(path: string, options?: GlobOptions): Glob;
  glob(path: string, options?: GlobOptions): Glob {
    return Glob.create(
      this.#absolutePath,
      resolve(this.#absolutePath, path),
      options
    );
  }
}

export type { Path };

export abstract class DiskFile extends Path {
  declare dir: (path: string) => Directory;
  declare file: (path: string) => RegularFile;

  exists(): boolean {
    return existsSync(this.absolute);
  }
}

export class UnknownFile extends DiskFile {
  create(root: string, absolutePath: string): UnknownFile {
    return new UnknownFile(root, absolutePath);
  }
}

export interface AsRegularFile {
  expand: () => RegularFile;
}

export class RegularFile extends DiskFile implements AsRegularFile {
  create(root: string, path: string): RegularFile {
    return new RegularFile(root, path);
  }

  async rm(): Promise<void> {
    await unlink(this.absolute);
  }

  rmSync(): void {
    unlinkSync(this.absolute);
  }

  async read(): Promise<string>;
  async read<T extends JsonObject>(options: { as: "json" }): Promise<T>;
  async read({ as }: { as?: "json" } = {}): Promise<unknown> {
    return this.#as(await readFile(this.absolute, "utf8"), as);
  }

  readSync(): string;
  readSync<T extends JsonObject>(options: { as: "json" }): T;
  readSync({ as }: { as?: "json" } = {}): unknown {
    return this.#as(readFileSync(this.absolute, "utf8"), as);
  }

  async write(value: string): Promise<void>;
  async write(value: JsonObject, options: { as: "json" }): Promise<void>;
  async write(
    value: string | object,
    { as }: { as?: "json" } = {}
  ): Promise<void> {
    if (as === "json") {
      await writeFile(this.absolute, stringifyJSON(value));
    } else if (typeof value === "string") {
      await writeFile(this.absolute, value);
    } else {
      throw Error(
        `Cannot write an object to file without specifying { as: "json" }`
      );
    }
  }

  writeSync(value: string): void;
  writeSync(value: JsonObject, options: { as: "json" }): void;
  writeSync(value: string | object, { as }: { as?: "json" } = {}): void {
    if (as === "json") {
      writeFileSync(this.absolute, stringifyJSON(value));
    } else if (typeof value === "string") {
      writeFileSync(this.absolute, value);
    } else {
      throw Error(
        `Cannot write an object to file without specifying { as: "json" }`
      );
    }
  }

  #as(raw: string, as: "json" | undefined): unknown {
    if (as === "json") {
      return JSON.parse(raw);
    } else {
      return raw;
    }
  }

  expand(): this {
    return this;
  }
}

export interface AsDirectory {
  expand: () => Directory;
}

export class Directory extends DiskFile implements AsDirectory {
  create(root: string, path: string): Directory {
    return new Directory(root, path);
  }

  globs(options?: GlobOptions<["files"]>): Globs<RegularFile>;
  globs(options?: GlobOptions<["directories"]>): Globs<Directory>;
  globs(options?: GlobOptions): Globs;
  globs(options?: GlobOptions): Globs {
    return Globs.root(this, options);
  }

  isRoot(): boolean {
    return Path.isRoot(this);
  }

  expand(): this {
    return this;
  }
}

export interface GlobOptions<M extends GlobMatch[] = GlobMatch[]> {
  allow?: GlobAllow;
  match?: M;
}

export type GlobMatch = "files" | "directories";
export type GlobAllow = "symlink";

function includeOptions(include?: GlobMatch[]): Options {
  if (include === undefined) {
    return { onlyDirectories: false, onlyFiles: false };
  }

  const options: Options = {};

  if (include.includes("files") && include.includes("directories")) {
    options.onlyDirectories = false;
    options.onlyFiles = false;
  } else if (include.includes("files")) {
    options.onlyFiles = true;
  } else if (include.includes("directories")) {
    options.onlyDirectories = true;
  }

  return options;
}

export class Glob<T extends Path = Path> extends Path {
  static create(
    root: string,
    path: string,
    options: GlobOptions<["files"]>
  ): Glob<RegularFile>;
  static create(
    root: string,
    path: string,
    options: GlobOptions<["directories"]>
  ): Glob<Directory>;
  static create(root: string, path: string, options?: GlobOptions): Glob;
  static create(root: string, path: string, options?: GlobOptions): Glob {
    return new Glob(root, path, options);
  }

  static options(glob: Glob): GlobOptions {
    return glob.#options;
  }

  static isMatch<G extends GlobOptions>(glob: Glob, options?: G): boolean {
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

  private constructor(
    root: string,
    path: string,
    options: GlobOptions | undefined
  ) {
    super(root, path);
    this.#options = options ?? {};
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    if (objectHasKeys(this.#options)) {
      return stringify`Glob(${this}) ${JSON.stringify(this.#options)}`;
    } else {
      return stringify`Glob(${this})`;
    }
  }

  create(root: string, path: string): Glob {
    return new Glob(root, path, this.#options);
  }

  override join(path: string, options?: GlobOptions): Glob {
    return new Glob(this.root.absolute, resolve(this.absolute, path), {
      ...this.#options,
      ...options,
    });
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

  expand(): T[] {
    const options = this.#options;

    return glob
      .sync(this.absolute, {
        ...includeOptions(options.match),
        objectMode: true,
        absolute: true,
      })
      .flatMap((entry): T[] => {
        const dirent = entry.dirent;

        if (dirent.isDirectory()) {
          return this.#ifIncluded(
            entry,
            (entry) =>
              new Directory(this.root.absolute, entry.path) as unknown as T
          );
        } else if (dirent.isFile()) {
          return this.#ifIncluded(
            entry,
            (entry) =>
              new RegularFile(this.root.absolute, entry.path) as unknown as T
          );
        } else if (dirent.isSymbolicLink()) {
          // TODO
        } else {
          console.warn(
            stringify`glob pattern ${this} unexpectedly matched the ${classify(
              dirent
            )} ${entry.path}`
          );
        }

        return [];
      });
  }

  #ifIncluded<P extends Path>(entry: Entry, create: (entry: Entry) => P): P[] {
    const options = this.#options;

    if (options.match === undefined) {
      return [create(entry)];
    } else if (options.match.includes("files") && entry.dirent.isFile()) {
      return [create(entry)];
    } else if (
      options.match.includes("directories") &&
      entry.dirent.isDirectory()
    ) {
      return [create(entry)];
    } else {
      return [];
    }
  }

  and(path: string): Globs<Path>;
  and(path: Glob<T>): Globs<T>;
  and(path: string | Glob, options?: GlobOptions): Globs {
    const globs = Globs.root(this.root, this.#options);

    globs.add(this);

    if (typeof path === "string") {
      globs.add(
        new Glob(this.root.absolute, resolve(this.absolute, path), options)
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
    options?: GlobOptions<["directories"]>
  ): Globs<Directory>;
  static root<T extends Path>(root: Path, options?: GlobOptions): Globs<T>;
  static root(root: Path, options?: GlobOptions): Globs {
    return new Globs(root, [], options);
  }

  readonly #root: Path;
  readonly #options: GlobOptions;
  readonly #globs: readonly Glob[];

  private constructor(
    root: Path,
    globs: Glob[],
    options: GlobOptions | undefined
  ) {
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

  add(
    globs: Glob<T> | readonly Glob<T>[] | string | readonly string[]
  ): Globs<T>;
  add(globs: readonly Glob[] | Glob | string | readonly string[]): Globs {
    if (isArray(globs)) {
      const addedGlobs = globs.map((glob) => this.#added(glob));
      const allGlobs = [...this.#globs, ...addedGlobs];
      return new Globs(this.#root, allGlobs, this.#options);
    } else {
      const added = this.#added(globs);
      const allGlobs = [...this.#globs, added];
      return new Globs(this.#root, allGlobs, this.#options);
    }
  }

  #added(glob: string | Glob): Glob {
    if (typeof glob === "string") {
      return Glob.create(
        this.#root.absolute,
        resolve(this.#root.absolute, glob),
        this.#options
      );
    } else {
      if (glob.root.absolute !== this.#root.absolute) {
        return glob.rootTo(this.#root);
      }

      if (!Glob.isMatch(glob, this.#options)) {
        throw Error(
          `Attempting to add a glob to a collection with options ${JSON.stringify(
            this.#options
          )}, but the glob had the options ${JSON.stringify(
            Glob.options(glob)
          )}`
        );
      }

      return glob;
    }
  }

  expand(): T[] {
    return this.#globs.flatMap((glob) => glob.expand()) as T[];
  }
}

class Packages extends Directory {
  readonly react = this.file("react");
  readonly universal = this.file("universal");
  readonly x = this.file("x");

  get all(): Glob<Directory> {
    return this.glob("*/*", { match: ["directories"] });
  }

  override create(root: string, path: string): this {
    return new Packages(root, path) as this;
  }
}

/**
 * Convert a path separated with `/` (the API for this package) to a list of path segments.
 *
 * This means that `\` will be treated as a normal character (even on Windows), which means that
 * this API doesn't support verbatim paths (paths starting with `\\?\`).
 */
export function parts(path: string): string[] {
  return path.split("/");
}

export function join(...parts: string[]): string {
  return parts.join("/");
}

export function resolve(root: string, path: string): string {
  return nodeResolve(root, ...parts(path));
}

function classify(entry: Dirent): string {
  if (entry.isBlockDevice()) {
    return "block device";
  } else if (entry.isCharacterDevice()) {
    return "character device";
  } else if (entry.isDirectory()) {
    return "directory";
  } else if (entry.isFIFO()) {
    return "FIFO";
  } else if (entry.isFile()) {
    return "file";
  } else if (entry.isSocket()) {
    return "socket";
  } else if (entry.isSymbolicLink()) {
    return "symbolic link";
  } else {
    return "unknown file";
  }
}

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
function isArray<T>(value: unknown | readonly T[]): value is readonly T[];
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
function isArray<T>(value: unknown | T[]): value is T[];
function isArray(value: unknown): value is unknown[];
function isArray(value: unknown): boolean {
  return Array.isArray(value);
}
