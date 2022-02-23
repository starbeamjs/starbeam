import { diff, DiffData } from "fast-array-diff";
import searchGlob from "fast-glob";
import * as fs from "fs/promises";
import * as path from "path";
import { isAbsolute } from "path";
import { PromiseReadable } from "promise-readable";
import sh from "shell-escape-tag";
import shell from "shelljs";
import * as util from "util";

export const INSPECT = Symbol.for("nodejs.util.inspect.custom");

export class Workspace {
  /**
   * @param root the root of the workspace, as an absolute directory
   */
  static async create(root: string, namespace: string) {
    let paths = await workspacePackages(root, namespace);

    let packages = await Promise.all(
      paths.map(async (packageRoot) => {
        let manifest = path.resolve(packageRoot, "package.json");
        let buf = await fs.readFile(manifest, { encoding: "utf8" });
        let json: JsonObject = JSON.parse(buf);

        let root = path.dirname(manifest);
        let name = path.basename(root);

        return Package.create(() => workspace, name, json);
      })
    );

    const workspace: Workspace = new Workspace(root, namespace, packages);
    return workspace;
  }

  /**
   * The npm namespace (e.g. the #namespace of `@starbeam/core` is `@starbeam`)
   */
  readonly #namespace: string;
  /**
   * The root of the workspace, as an absolute directory
   */
  readonly #root: string;

  #packages: readonly Package[];

  private constructor(
    root: string,
    namespace: string,
    packages: readonly Package[]
  ) {
    this.#root = root;
    this.#namespace = namespace;
    this.#packages = packages;
  }

  get root(): string {
    return this.#root;
  }

  get packages(): readonly Package[] {
    return this.#packages;
  }

  get namespace(): string {
    return this.#namespace;
  }
}

type JsonValue = string | number | boolean | null | JsonArray | JsonObject;
type JsonArray = readonly JsonValue[];
type JsonObject = { [P in string]: JsonValue };

class Package {
  static create(
    workspace: () => Workspace,
    name: string,
    manifest: JsonObject
  ): Package {
    return new Package(workspace, name, manifest);
  }

  /**
   * The workspace that this package belongs to. It's a thunk because workspaces
   * and packages are cyclic and have to be initialized together.
   */
  readonly #workspaceThunk: () => Workspace;

  /**
   * The name of the package. For example, `#name` of `@starbeam/core` is `core`
   */
  readonly #localName: string;

  /**
   * The parsed package.json
   */
  readonly #manifest: JsonObject;

  private constructor(
    workspace: () => Workspace,
    name: string,
    manifest: JsonObject
  ) {
    this.#workspaceThunk = workspace;
    this.#localName = name;
    this.#manifest = manifest;
  }

  get #workspace(): Workspace {
    return this.#workspaceThunk();
  }

  get name(): string {
    return `${this.#workspace.namespace}/${this.#localName}`;
  }

  /**
   * The root of this package, which contains the package.json
   */
  get root(): AbsolutePath {
    return AbsolutePath.directory(
      path.resolve(
        this.#workspace.root,
        this.#workspace.namespace,
        this.#localName
      )
    );
  }

  get packageJSON(): string {
    return path.resolve(this.#workspace.root);
  }

  async compile() {
    // let root = this.root;
    // let dist = path.join(this.root, "dist");

    let transpilation = await this.#packageTranspilation();
    let diff = transpilation.diff(
      logged(await this.#getDistFiles(), "this.#getDistFiles")
    );

    log(diff);

    // for (let task of files) {
    //   // console.log(task);
    // }

    // let files = await glob(`${root}/!(node_modules)**/*.ts`);

    // // console.log({ files });

    // for (let file of files) {
    //   if (file.endsWith(".d.ts")) {
    //     console.warn(
    //       `Unexpected .d.ts file found during compilation (${file})`
    //     );
    //     continue;
    //   }

    //   let relative = path.relative(root, file);
    //   let output = await swc.transformFile(file, {
    //     sourceMaps: "inline",
    //     inlineSourcesContent: true,
    //     jsc: {
    //       parser: {
    //         syntax: "typescript",
    //         decorators: true,
    //       },
    //       target: "es2022",
    //     },
    //   });

    //   let target = changeExtension(`${dist}/${relative}`, "js");

    //   shell.mkdir("-p", path.dirname(target));

    //   fs.writeFile(target, output.code);
    // }
  }

  get #dist(): AbsolutePath {
    return this.root.directory("dist");
  }

  async #packageTranspilation(): Promise<Transpilation> {
    let files = await AbsolutePaths.glob(`!(node_modules)**/*.ts`, this.root);

    let dts = files.filter((file) => file.hasExactExtension("d.ts"));

    for (let file of dts) {
      console.warn(`Unexpected .d.ts file found during compilation (${file})`);
    }

    let ts = files
      .filter((file) => file.hasExactExtension("ts"))
      .filter((file) => file.eq(this.root));

    return Transpilation.create(
      ts.mapArray((file) => this.#fileTranspilation(file))
    );

    // let files = await glob(`${this.root}/!(node_modules)**/*.ts`);

    // for (let file of files) {
    //   if (file.endsWith(".d.ts")) {
    //     console.warn(
    //       `Unexpected .d.ts file found during compilation (${file})`
    //     );
    //   }
    // }

    // let tasks = files
    //   .filter((file) => !file.startsWith(this.#dist))
    //   .filter((file) => !file.endsWith(".d.ts"))
    //   .map((file) => this.#fileTranspilation(file));

    // return Transpilation.create(tasks);
  }

  async #getDistFiles(): Promise<AbsolutePaths> {
    return this.#dist.glob("**", { kind: "all" });
  }

  #fileTranspilation(inputPath: AbsolutePath): TranspileTask {
    let relativePath = inputPath.relativeFromAncestor(this.root);
    let output = this.#dist.file(relativePath).changeExtension("js");

    // console.log({ relativePath, output });

    return TranspileTask.create(inputPath, output);
  }
}

class Transpilation {
  static create(tasks: readonly TranspileTask[]) {
    return new Transpilation(tasks);
  }

  readonly #tasks: readonly TranspileTask[];

  private constructor(tasks: readonly TranspileTask[]) {
    this.#tasks = tasks;
  }

  diff(existing: AbsolutePaths) {
    return existing.diffByKind(this.outputPaths);
  }

  get outputPaths(): AbsolutePaths {
    let files = AbsolutePaths.from(this.#tasks.map((task) => task.output));
    let directories = files.directory;

    return files.merge(directories);
  }
}

abstract class Mappable<Single, Multiple> {
  abstract map(mapper: (path: Single) => Single | null): Multiple;

  abstract flatMap(
    mapper: (path: Single) => readonly Single[] | Multiple | Single
  ): Multiple;

  abstract find(finder: (path: Single) => boolean): Single | void;

  abstract reduce<U>(
    mapper: (build: U, path: Single) => void,
    build: U,
    strategy: "mutate"
  ): U;
  abstract reduce<U>(
    mapper: (accumulator: U, path: Single) => void,
    initial: U,
    strategy?: "functional"
  ): U;

  filter(filter: (item: Single) => boolean): Multiple {
    return this.map((single) => (filter(single) ? single : null));
  }

  mapArray<U>(mapper: (item: Single) => U): readonly U[] {
    return this.reduce(
      (array: U[], item) => array.push(mapper(item)),
      [],
      "mutate"
    );
  }
}

class AbsolutePaths
  extends Mappable<AbsolutePath, AbsolutePaths>
  implements Iterable<AbsolutePath>
{
  static empty(): AbsolutePaths {
    return new AbsolutePaths(new Map());
  }

  static async all(
    inside: AbsolutePath,
    options: { kind: FileKind | "all" } = { kind: "regular" }
  ): Promise<AbsolutePaths> {
    return AbsolutePaths.glob("**", inside, options);
  }

  static async glob(
    glob: string,
    inside: AbsolutePath,
    { kind }: { kind: FileKind | "all" } = {
      kind: "regular",
    }
  ) {
    let fullGlob = path.resolve(AbsolutePath.getFilename(inside), glob);
    return AbsolutePaths.#glob(fullGlob, kind);
  }

  static async #glob(
    glob: string,
    kind: FileKind | "all"
  ): Promise<AbsolutePaths> {
    switch (kind) {
      case "directory": {
        return AbsolutePaths.marked(
          await searchGlob(glob, {
            markDirectories: true,
            onlyDirectories: true,
          })
        );
      }

      case "regular": {
        return AbsolutePaths.marked(
          await searchGlob(glob, {
            onlyFiles: true,
          })
        );
      }

      case "all": {
        return AbsolutePaths.marked(
          await searchGlob(glob, {
            onlyFiles: false,
            onlyDirectories: false,
            markDirectories: true,
          })
        );
      }

      default: {
        exhaustive(kind, "kind");
      }
    }
  }

  static from(paths: readonly IntoAbsolutePath[]): AbsolutePaths {
    let set = AbsolutePaths.empty();

    for (let path of paths) {
      set.add(AbsolutePath.from(path));
    }

    return set;
  }

  static marked(paths: Iterable<string>): AbsolutePaths {
    let set = AbsolutePaths.empty();
    set.add([...paths].map(AbsolutePath.marked));
    return set;
  }

  #paths: Map<string, AbsolutePath>;

  constructor(paths: Map<string, AbsolutePath>) {
    super();
    this.#paths = paths;
  }

  clone(): AbsolutePaths {
    return new AbsolutePaths(new Map(this.#paths));
  }

  get size(): number {
    return this.#paths.size;
  }

  get regularFiles(): AbsolutePaths {
    return this.map((path) => (path.isRegularFile ? path : null));
  }

  get directories(): AbsolutePaths {
    return this.map((path) => (path.isDirectory ? path : null));
  }

  /**
   * Map each path in this set:
   *
   * - if it's a directory, leave it alone
   * - if it's a regular file, get the file's directory
   */
  get directory(): AbsolutePaths {
    return this.map((path) => (path.isDirectory ? path : path.parent));
  }

  /**
   * Returns true if any of the files in this set are directories that contain this path
   */
  contains(maybeChild: AbsolutePath): boolean {
    return !!this.find((path) => path.contains(maybeChild));
  }

  diff(other: AbsolutePaths): { added: AbsolutePaths; removed: AbsolutePaths } {
    let diffs = diff(
      [...this],
      [...other],
      (a, b) => AbsolutePath.getFilename(a) === AbsolutePath.getFilename(b)
    );

    return {
      added: AbsolutePaths.from(diffs.added),
      removed: AbsolutePaths.from(diffs.removed),
    };
  }

  /**
   * This method diffs files and directories, but excludes any removed files
   * that are descendents of a removed directory.
   */
  diffByKind(other: AbsolutePaths) {
    let directories = this.directories.diff(other.directories);
    let collapsedDirectories = directories.removed.collapsedDirectories();

    let files = this.regularFiles.diff(other.regularFiles);

    return {
      files: {
        added: files.added,
        removed: files.removed.removeDescendentsOf(collapsedDirectories),
      },
      directories: {
        added: directories.added,
        removed: collapsedDirectories,
      },
    };
  }

  /**
   * Collapse any child directories into their parents.
   */
  collapsedDirectories(): AbsolutePaths {
    let collapsed = AbsolutePaths.empty();

    for (let { path, rest } of this.#drain()) {
      if (path.isRegularFile || !rest.contains(path)) {
        collapsed.add(path);
      }
    }

    this.#paths = collapsed.#paths;
    return collapsed;
  }

  removeDescendentsOf(ancestors: AbsolutePaths): AbsolutePaths {
    return this.map((path) => (ancestors.contains(path) ? null : path));
  }

  merge(
    paths: AbsolutePath | AbsolutePaths | readonly AbsolutePath[]
  ): AbsolutePaths {
    let cloned = this.clone();
    cloned.add(paths);
    return cloned;
  }

  add(paths: AbsolutePath | AbsolutePaths | readonly AbsolutePath[]): void {
    if (isArray(paths)) {
      for (let path of paths) {
        this.#add(path);
      }
    } else if (paths instanceof AbsolutePaths) {
      for (let path of paths) {
        this.#add(path);
      }
    } else {
      this.#add(paths);
    }
  }

  #add(...paths: readonly AbsolutePath[]): void {
    for (let path of paths) {
      let filename = AbsolutePath.getFilename(path);

      if (!this.#paths.has(filename)) {
        this.#paths.set(filename, path);
      }
    }
  }

  remove(paths: AbsolutePaths | AbsolutePath) {
    let thisPaths = this.#paths;

    if (paths instanceof AbsolutePath) {
      let filename = AbsolutePath.getFilename(paths);
      thisPaths.delete(filename);
    } else {
      for (let filename of paths.#paths.keys()) {
        thisPaths.delete(filename);
      }
    }
  }

  has(path: AbsolutePath): boolean {
    return this.#paths.has(AbsolutePath.getFilename(path));
  }

  reduce<U>(
    mapper: (build: U, path: AbsolutePath) => void,
    build: U,
    strategy: "mutate"
  ): U;
  reduce<U>(
    mapper: (accumulator: U, path: AbsolutePath) => void,
    initial: U,
    strategy?: "functional"
  ): U;
  reduce<U>(
    mapper: (build: U, path: AbsolutePath) => U | void,
    initial: U,
    strategy: "functional" | "mutate" = "functional"
  ): U {
    if (strategy === "mutate") {
      for (let path of this) {
        mapper(initial, path);
      }

      return initial;
    } else {
      let accumulator = initial;

      for (let path of this) {
        accumulator = mapper(accumulator, path) as U;
      }

      return accumulator;
    }
  }

  map(mapper: (path: AbsolutePath) => AbsolutePath | null): AbsolutePaths {
    let paths = AbsolutePaths.empty();

    for (let path of this.#paths.values()) {
      let mappedPath = mapper(path);

      if (mappedPath) {
        paths.add(mappedPath);
      }
    }

    return paths;
  }

  flatMap(
    mapper: (
      path: AbsolutePath
    ) => readonly AbsolutePath[] | AbsolutePaths | AbsolutePath
  ): AbsolutePaths {
    let paths = AbsolutePaths.empty();

    for (let path of this.#paths.values()) {
      paths.add(mapper(path));
    }

    return paths;
  }

  find(finder: (path: AbsolutePath) => boolean): AbsolutePath | void {
    for (let path of this.#paths.values()) {
      let found = finder(path);

      if (found) {
        return path;
      }
    }
  }

  get #sorted(): Map<string, AbsolutePath> {
    let entries = [...this.#paths.entries()].sort(
      ([a], [b]) => a.length - b.length
    );
    return new Map(entries);
  }

  /**
   * Iterate the paths in this set. Smaller paths come first.
   */
  *#drain(): IterableIterator<{ path: AbsolutePath; rest: AbsolutePaths }> {
    let rest = this.#sorted.entries();
    let next = rest.next();

    while (!next.done) {
      let [, path] = next.value;
      let restPaths = new AbsolutePaths(new Map(rest));

      yield { path, rest: restPaths };

      rest = restPaths.#paths.entries();
      next = rest.next();
    }
  }

  *[Symbol.iterator]() {
    for (let path of this.#sorted.values()) {
      yield path;
    }
  }

  [INSPECT]() {
    return [...this];
  }
}

function isArray<T extends unknown[] | readonly unknown[]>(
  value: unknown | T
): value is T {
  return Array.isArray(value);
}

function isRoot(p: string): boolean {
  return path.parse(p).root === p;
}

type FileKind = "regular" | "directory";
type SearchKind = FileKind | "all";
type AbsolutePathKind = FileKind | "root";
type IntoAbsolutePath =
  | AbsolutePath
  | FileParts
  | [kind: AbsolutePathKind | "marked", filename: string];

interface Search {
  kind: SearchKind;
}

class AbsolutePath {
  static file(path: string): AbsolutePath {
    return AbsolutePath.#checked(path, "regular", ".file");
  }

  static from(intoPath: IntoAbsolutePath): AbsolutePath {
    if (isArray(intoPath)) {
      let [kind, filename] = intoPath;

      switch (kind) {
        case "root":
        case "directory":
          return AbsolutePath.directory(filename);
        case "marked":
          return AbsolutePath.marked(filename);
        case "regular":
          return AbsolutePath.file(filename);

        default:
          exhaustive(kind, "kind");
      }
    } else if (intoPath instanceof AbsolutePath) {
      return intoPath;
    } else {
      let {
        parent,
        basename: { file, ext },
        kind,
      } = intoPath;

      if (parent) {
        if (ext) {
          let filename = path.resolve(parent, `${file}.${ext}`);
          return AbsolutePath.#checked(filename, kind ?? "regular", ".from");
        } else {
          let filename = path.resolve(parent, file);
          return AbsolutePath.#checked(filename, kind ?? "regular", ".from");
        }
      } else {
        // no parent means the file represents the root
        if (typeof kind === "string" && kind !== "root") {
          throw Error(
            `BUG: getParts() produced { parent: null, kind: not 'root' } (invariant check)`
          );
        }

        return AbsolutePath.#checked(file, "root", ".from");
      }
    }
  }

  static directory(directory: string): AbsolutePath {
    if (isRoot(directory)) {
      return AbsolutePath.#checked(directory, "root", ".directory");
    } else {
      return AbsolutePath.#checked(directory, "directory", ".directory");
    }
  }

  static marked(path: string): AbsolutePath {
    if (isRoot(path)) {
      return AbsolutePath.#checked(path, "root", ".marked");
    } else if (path.endsWith("/")) {
      return AbsolutePath.#checked(path, "directory", ".marked");
    } else {
      return AbsolutePath.#checked(path, "regular", ".marked");
    }
  }

  static #checked(
    filename: string,
    kind: "root" | "directory" | "regular",
    fromStaticMethod: string
  ): AbsolutePath {
    if (isAbsolute(filename)) {
      return new AbsolutePath(kind, filename);
    } else {
      throw Error(
        `Unexpected relative path passed to AbsolutePath${fromStaticMethod} (${path})`
      );
    }
  }

  static getFilename(path: AbsolutePath): string {
    return path.#filename;
  }

  // A directory ends with `/`, while a file does not
  readonly #kind: "regular" | "directory" | "root";
  readonly #filename: string;

  private constructor(
    kind: "regular" | "directory" | "root",
    filename: string
  ) {
    this.#kind = kind;
    this.#filename = filename;
  }

  get isRoot(): boolean {
    return this.#kind === "root";
  }

  get isDirectory(): boolean {
    return this.#kind === "directory" || this.#kind === "root";
  }

  get isRegularFile(): boolean {
    return this.#kind === "regular";
  }

  /**
   * Get the parent directory of this AbsolutePath. If this path represents a
   * file system root, `parent` returns null.
   */
  get parent(): AbsolutePath | null {
    // Avoid infinite recursion at the root (`/` or `C:\`, etc.)
    if (this.isRoot) {
      return null;
    } else {
      return AbsolutePath.directory(path.dirname(this.#filename));
    }
  }

  get basename(): { file: string; ext: string | null } {
    return getParts(this.#filename).basename;
  }

  get extension(): string | null {
    return this.basename.ext;
  }

  /**
   * Returns true if the specified extension is at the end of the filename. This
   * means that `index.d.ts` has the extension `d.ts` *and* `ts`.
   *
   * See hasExactExtension if you want `d.ts` to match, but not `ts`
   */
  hasExtension<S extends `.${string}`>(
    extension: S
  ): `The extension passed to hasExtension should not have a leading '.'`;
  hasExtension(extension: string): boolean;
  hasExtension(extension: string): unknown {
    if (extension.startsWith(".")) {
      throw Error(
        `The extension passed to hasExtension should not have a leading '.'`
      );
    }

    let {
      basename: { ext },
    } = getParts(this.#filename);

    return ext === extension;
  }

  changeExtension<S extends `.${string}`>(
    extension: S
  ): `The extension passed to hasExtension should not have a leading '.'`;
  changeExtension(extension: string): AbsolutePath;
  changeExtension(extension: string): unknown {
    let {
      parent,
      basename: { file, ext },
    } = getParts(this.#filename);

    return AbsolutePath.file(path.resolve());
  }

  /**
   * Returns true if the file matches the exact extension. This means that
   * `index.d.ts` has the exact extension `d.ts` but *not* `ts`.
   */
  hasExactExtension<S extends `.${string}`>(
    extension: S
  ): `The extension passed to hasExtension should not have a leading '.'`;
  hasExactExtension(extension: string): boolean;
  hasExactExtension(extension: string): unknown {
    if (extension.startsWith(".")) {
      throw Error(
        `The extension passed to hasExtension should not have a leading '.'`
      );
    }

    let {
      basename: { ext },
    } = getParts(this.#filename);

    return ext === extension;
  }

  async glob(search: Search): Promise<AbsolutePaths>;
  async glob(glob: string, search?: Search): Promise<AbsolutePaths>;
  async glob(): Promise<AbsolutePaths>;
  async glob(
    ...args: [search: Search] | [glob: string, search?: Search] | []
  ): Promise<AbsolutePaths> {
    let glob: string | undefined = undefined;
    let search: Search | undefined = undefined;

    if (args.length !== 0) {
      if (typeof args[0] === "string") {
        [glob, search] = args;
      } else {
        [search] = args;
      }
    }

    if (this.#kind === "regular") {
      throw Error(
        `You cannot execute a glob inside a regular file (file=${
          this.#filename
        }, glob=${glob}, search=${search?.kind ?? "regular"})`
      );
    }

    return AbsolutePaths.glob(glob ?? "**", this, search);
  }

  file(...relativePath: readonly string[]): AbsolutePath {
    if (this.#kind === "regular") {
      throw Error(
        `Cannot create a nested file inside a regular file (parent=${
          this.#filename
        }, child=${path.join(...relativePath)})`
      );
    }

    return AbsolutePath.file(path.resolve(this.#filename, ...relativePath));
  }

  directory(...relativePath: readonly string[]): AbsolutePath {
    if (this.#kind === "regular") {
      throw Error(
        `Cannot create a nested directory inside a regular file (parent=${
          this.#filename
        }, child=${path.join(...relativePath)})`
      );
    }

    return AbsolutePath.directory(
      path.resolve(this.#filename, ...relativePath)
    );
  }

  relativeFromAncestor(ancestor: AbsolutePath) {
    if (!ancestor.contains(this)) {
      throw Error(
        `Cannot compute a relative path from ${ancestor.#filename} to ${
          this.#filename
        }, because it is not an ancestor`
      );
    }

    return path.relative(ancestor.#filename, this.#filename);
  }

  contains(maybeChild: AbsolutePath): boolean {
    let relative = path.relative(this.#filename, maybeChild.#filename);

    return !relative.startsWith(".");
  }

  eq(other: AbsolutePath) {
    return this.#filename === other.#filename;
  }

  [INSPECT](context: null, { stylize }: util.InspectOptionsStylized) {
    return `${stylize("Path", "special")}(${stylize(
      this.#filename,
      "module"
    )})`;
  }
}

class PrepareTranspilation {
  readonly #files: DiffData<string>;
  readonly #directories: DiffData<string>;

  constructor(files: DiffData<string>, directories: DiffData<string>) {
    this.#files = files;
    this.#directories = directories;
  }

  async prepare() {}
}

class TranspileTask {
  static create(input: AbsolutePath, output: AbsolutePath): TranspileTask {
    return new TranspileTask(input, output);
  }

  private constructor(
    readonly input: AbsolutePath,
    readonly output: AbsolutePath
  ) {}
}

async function workspacePackages(root: string, filter: string) {
  let stdout = await exec(
    sh`pnpm m ls --filter ./${filter} --depth -1 --porcelain`
  );

  if (stdout === undefined) {
    return [];
  }

  return stdout
    .split("\n")
    .filter((file) => file !== "" && file !== root)
    .map((p) => path.relative(root, p));
}

interface ExecErrorOptions extends ErrorOptions {
  code: number | null;
  command: string;
}

class ExecError extends Error {
  readonly #code: number | null;
  readonly #command: string;

  constructor(message: string, options: ExecErrorOptions) {
    super(message, options);

    this.#code = options.code;
    this.#command = options.command;

    Error.captureStackTrace(this, this.constructor);
  }

  get code(): number | "unknown" {
    return this.#code ?? "unknown";
  }

  get message(): string {
    let message = super.message;
    let header = `Exec Failed with code=${this.code}\n  (in ${this.#command})`;

    if (message) {
      return `${header}\n\n${message}`;
    } else {
      return header;
    }
  }
}

function exec(command: string): Promise<string | undefined> {
  return new Promise((fulfill, reject) => {
    let child = shell.exec(command, { silent: true, async: true });

    let stdout = readAll(child.stdout);
    let stderr = readAll(child.stderr);

    child.on("error", (err) => reject(err));
    child.on("exit", async (code) => {
      log("exec status", { code, stdout: await stdout });

      if (code === 0) {
        fulfill(await stdout);
      } else {
        log("exec error", {
          error: await stderr,
          out: await stdout,
          code,
          command,
        });
        reject(new ExecError((await stderr) ?? "", { code, command }));
      }
    });
  });
}

interface ReadableStream extends NodeJS.ReadableStream {
  closed?: boolean;
  destroyed?: boolean;
  destroy?(): void;
}

async function readAll(
  readable?: ReadableStream | null
): Promise<string | undefined> {
  if (readable === undefined || readable === null) {
    return;
  }

  let result = await new PromiseReadable(readable).readAll();

  if (result === undefined) {
    return undefined;
  } else if (typeof result === "string") {
    return result;
  } else {
    return result.toString("utf-8");
  }
}

const PARTS_MATCHER = /^(?<file>[^.]*)(?:[.](?<ext>.*))?$/;

interface FileParts {
  readonly parent: string | null;
  readonly basename: {
    readonly file: string;
    readonly ext: string | null;
  };
  readonly kind?: AbsolutePathKind;
}

function getParts(filename: string): FileParts {
  let parent = getParent(filename);
  let basename = path.basename(filename);

  let extension = basename.match(PARTS_MATCHER);

  if (extension === null) {
    return { parent, basename: { file: basename, ext: null } };
  }

  let { file, ext } = extension.groups!;

  return {
    parent,
    basename: { file, ext },
    kind: parent === null ? "root" : undefined,
  };

  // let [, basename, extname];
}

function getParent(filename: string): string | null {
  let parent = path.dirname(filename);
  let root = path.parse(parent).root;

  if (filename === root) {
    return null;
  } else {
    return parent;
  }
}

function changeExtension(file: string, to: string): string {
  const basename = path.basename(file, path.extname(file));
  return path.join(path.dirname(file), `${basename}.${to}`);
}

function exhaustive(value: never, description: string): never {
  throw Error(`Expected ${description} to be exhaustively checked`);
}

function log(...args: [value: unknown] | [label: string, value: unknown]) {
  if (args.length === 2) {
    let [label, value] = args;
    console.log(label, util.inspect(value, { depth: null, colors: true }));
  } else {
    let [value] = args;
    console.log(util.inspect(value, { depth: null, colors: true }));
  }
}

function logged<T>(value: T, description: string): T {
  console.log(
    description,
    "=",
    util.inspect(value, { depth: null, colors: true })
  );
  return value;
}
