import swc from "@swc/core";
import * as fs from "fs/promises";
import * as path from "path";
import { PromiseReadable } from "promise-readable";
import sh from "shell-escape-tag";
import shell from "shelljs";
import { log } from "./log.js";
import {
  AbsolutePath,
  AbsolutePaths,
  digest,
  PathDiffByKind,
} from "./paths.js";
import type { PackageState, WorkspaceDetails } from "./workspace.js";

export const INSPECT = Symbol.for("nodejs.util.inspect.custom");

export class Package {
  static create(
    workspace: WorkspaceDetails,
    localName: string,
    state: PackageState
  ): Package {
    return new Package(workspace, localName, state);
  }

  readonly #workspace: WorkspaceDetails;

  /**
   * The name of the package. For example, `#name` of `@starbeam/core` is `core`
   */
  readonly #localName: string;

  readonly #state: PackageState;

  private constructor(
    workspace: WorkspaceDetails,
    localName: string,
    state: PackageState
  ) {
    this.#workspace = workspace;
    this.#localName = localName;
    this.#state = state;
  }

  // get #workspace(): Workspace {
  //   return this.#workspaceThunk();
  // }

  get name(): string {
    return `${this.#workspace.namespace}/${this.#localName}`;
  }

  /**
   * The root of this package, which contains the package.json
   */
  get root(): AbsolutePath {
    return this.#workspace.root.directory(
      this.#workspace.namespace,
      this.#localName
    );
  }

  async watch() {
    throw Error("todo: ");
  }

  async compile({ dryRun }: { dryRun: boolean } = { dryRun: false }) {
    const transpilation = await this.#packageTranspilation();
    const prepare = transpilation.prepare(await this.#getDistFiles());

    prepare.run({ dryRun });

    transpilation.transpile({ dryRun });
  }

  get #dist(): AbsolutePath {
    return this.root.directory("dist");
  }

  get #sourceFiles(): Promise<AbsolutePaths> {
    return AbsolutePaths.glob([`src/**/*.ts`, `index.ts`], this.root);
  }

  async #packageTranspilation(): Promise<Transpilation> {
    const sourceFiles = await this.#sourceFiles;

    const dts = sourceFiles.filter((file) => file.hasExactExtension("d.ts"));

    for (const file of dts) {
      console.warn(`Unexpected .d.ts file found during compilation (${file})`);
    }

    const ts = sourceFiles.filter((file) => file.hasExactExtension("ts"));

    log.silent.inspect.labeled(`[TS-FILES]`, ts);

    return Transpilation.create(
      this.name,
      this.#dist,
      ts.mapIntoArray((file) => this.#fileTranspilation(file)),
      this.#workspace
    );
  }

  async #getDistFiles(): Promise<AbsolutePaths> {
    return this.#dist.glob("**", { kind: "all" });
  }

  #fileTranspilation(inputPath: AbsolutePath): TranspileTask {
    const relativePath = inputPath.relativeFromAncestor(this.root);

    const output = this.#dist.file(relativePath).changeExtension("js");
    const digest = output.changeExtension("digest");
    const map = output.changeExtension("js.map");

    log.silent.inspect.labeled(`[TRANSPILE]`, {
      input: inputPath,
      root: this.root,
      relative: relativePath,
      output,
      digest,
    });

    return TranspileTask.create(inputPath, output, digest, map);
  }
}

class Transpilation {
  static create(
    name: string,
    dist: AbsolutePath,
    tasks: readonly TranspileTask[],
    workspace: WorkspaceDetails
  ) {
    return new Transpilation(name, dist, tasks, workspace);
  }

  readonly #name: string;
  readonly #dist: AbsolutePath;
  readonly #tasks: readonly TranspileTask[];
  readonly #workspace: WorkspaceDetails;

  private constructor(
    name: string,
    dist: AbsolutePath,
    tasks: readonly TranspileTask[],
    workspace: WorkspaceDetails
  ) {
    this.#name = name;
    this.#dist = dist;
    this.#tasks = tasks;
    this.#workspace = workspace;
  }

  prepare(existing: AbsolutePaths): PrepareTranspilation {
    return PrepareTranspilation.create(
      this.#name,
      existing.diffByKind(this.outputPaths),
      this.#dist
    );
  }

  async transpile({ dryRun }: { dryRun: boolean } = { dryRun: false }) {
    for (const task of this.#tasks) {
      log.silent.heading(`[TRANSPILING]`, this.#name);

      if (!dryRun) {
        task.transpile(this.#workspace);
      }
    }
  }

  get outputFiles(): AbsolutePaths {
    return AbsolutePaths.from(this.#tasks.flatMap((task) => task.outputs));
  }

  get digests(): AbsolutePaths {
    return this.outputFiles.map((file) => file.changeExtension("digest"));
  }

  get outputPaths(): AbsolutePaths {
    const files = this.outputFiles;
    log.silent.inspect.labeled("[OUT-FILES]", files);
    const directories = files.directory.without(this.#dist);
    log.silent.inspect.labeled("[OUT-DIRS]", files.directory);

    return files.merge(directories);
  }
}

class PrepareTranspilation {
  static create(
    name: string,
    diff: PathDiffByKind,
    dist: AbsolutePath
  ): PrepareTranspilation {
    return new PrepareTranspilation(name, diff, dist);
  }

  readonly #name: string;
  readonly #diff: PathDiffByKind;
  readonly #dist: AbsolutePath;

  private constructor(name: string, diff: PathDiffByKind, dist: AbsolutePath) {
    this.#name = name;
    this.#diff = diff;
    this.#dist = dist;
  }

  async run({ dryRun }: { dryRun: boolean } = { dryRun: false }) {
    const { directories, files } = this.#diff;

    if (dryRun) {
      log
        .newline()
        .log("[DRY-RUN]", this.#name)
        .newline()
        .heading("[DRY-RUN]", "Directories");

      for (const removed of directories.removed) {
        log.silent.inspect.labeled("  [--]", removed);
      }

      log.silent.inspect.labeled("  [++]", this.#dist);

      for (const added of directories.added) {
        log.silent.inspect.labeled("  [++]", added);
      }

      log.silent.newline().heading("[DRY-RUN]", "Files");

      for (const removed of files.removed) {
        log.silent.inspect.labeled("  [--]", removed);
      }

      for (const added of files.added) {
        log.silent.inspect.labeled("  [++]", added);
      }
    } else {
      for (const removed of directories.removed) {
        log.silent.inspect.labeled("[--]", removed);
        shell.rm("-r", AbsolutePath.getFilename(removed));
      }

      shell.mkdir("-p", AbsolutePath.getFilename(this.#dist));

      for (const directory of directories.added) {
        log.silent.inspect.labeled("[++]", directory);
        shell.mkdir("-p", AbsolutePath.getFilename(directory));
      }

      for (const removed of files.removed) {
        log.silent.inspect.labeled("  [--]", removed);
        shell.rm(AbsolutePath.getFilename(removed));
      }
    }
  }
}

class TranspileTask {
  static create(
    input: AbsolutePath,
    output: AbsolutePath,
    digest: AbsolutePath,
    map: AbsolutePath
  ): TranspileTask {
    return new TranspileTask(input, output, digest, map);
  }

  readonly #digest: AbsolutePath;
  readonly #map: AbsolutePath;

  private constructor(
    readonly input: AbsolutePath,
    readonly output: AbsolutePath,
    digest: AbsolutePath,
    map: AbsolutePath
  ) {
    this.#digest = digest;
    this.#map = map;
  }

  get outputs(): readonly AbsolutePath[] {
    return [this.output, this.#digest, this.#map];
  }

  async #digests(
    extra: string
  ): Promise<{ prev: string | null; next: string }> {
    const prev = await this.#digest.read();
    const input = await this.input.read();

    if (input === null) {
      throw Error(`Unable to read ${AbsolutePath.getFilename(this.input)}`);
    }

    const next = digest(input, extra);

    return { prev, next };
    // const next
  }

  async transpile(workspace: WorkspaceDetails) {
    log.silent.inspect.labeled("[TRANSPILE-TASK]", {
      input: this.input,
      output: this.output,
      digest: this.#digest,
    });

    const digests = await this.#digests(workspace.hash);

    if (digests.prev === digests.next) {
      const exists = await this.output.exists();

      if (exists) {
        log.silent.inspect.labeled("[FRESH]", this.input);
        return;
      } else {
        log.inspect.labeled("[MISSING]", this.input);
      }
    } else {
      log.inspect.labeled("[STALE]", this.input);
    }

    const input = await this.input.read();

    if (input === null) {
      log.error(
        `[ERROR]`,
        AbsolutePath.getFilename(this.input),
        "was not found. This probably means it was deleted (or had its permissions changed) during compilation."
      );
      return;
    }

    const output = await swc.transformFile(
      AbsolutePath.getFilename(this.input),
      {
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true,
          },
          target: "es2022",
        },
        swcrc: false,
        isModule: true,
        filename: AbsolutePath.getFilename(this.input),
        // sourceFileName: AbsolutePath.getFilename(this.input),
        sourceMaps: true,
        cwd: AbsolutePath.getFilename(workspace.root),
        sourceFileName: `starbeam://${this.input.relativeFromAncestor(
          workspace.root
        )}`,
        // sourceRoot: AbsolutePath.getFilename(workspace.root),
        // outputPath: AbsolutePath.getFilename(this.output),
      }
    );

    const map = output.map ? { ...JSON.parse(output.map) } : undefined;

    // const sourceMap = Buffer.from(JSON.stringify(map), "utf8").toString(
    //   "base64"
    // );

    // const sourceURLComment = `//# sourceURL=${AbsolutePath.getFilename(
    //   this.input
    // )}`;
    const sourceMapComment = `//# sourceMappingURL=${this.output.relativeFromAncestor(
      this.output.parent!
    )}.map`;

    const code = `${output.code}\n\n${sourceMapComment}`;

    log.silent.inspect.labeled("[WRITING]", {
      file: this.output,
      code: code,
    });

    await fs.writeFile(AbsolutePath.getFilename(this.#digest), digests.next, {
      encoding: "utf-8",
    });
    await fs.writeFile(
      AbsolutePath.getFilename(this.#map),
      JSON.stringify(map),
      {
        encoding: "utf-8",
      }
    );
    await fs.writeFile(AbsolutePath.getFilename(this.output), code);
  }
}

/**
 * Produces a list of package local names by:
 *
 * 1. asking pnpm for all of the packages in the workspace
 * 2. filtering by the workspace's namespace
 */
export async function workspacePackageNames(
  workspace: WorkspaceDetails
): Promise<readonly string[]> {
  const stdout = await exec(
    sh`pnpm m ls --filter ./${workspace.namespace} --depth -1 --porcelain`
  );

  if (stdout === undefined) {
    return [];
  }

  const rootFilename = AbsolutePath.getFilename(workspace.root);

  return stdout
    .split("\n")
    .filter((file) => file !== "" && file !== rootFilename)
    .map((p) =>
      getLocalName(path.relative(rootFilename, p), workspace.namespace)
    );
}

function getLocalName(packageName: string, expectedNamespace: string): string {
  const [namespace, name] = packageName.split("/", 2);

  if (expectedNamespace !== namespace) {
    throw Error(
      `Expected ${packageName} to have namespace ${expectedNamespace}`
    );
  }

  if (name.includes("/")) {
    throw Error(`Invalid '/' in local name of ${packageName}`);
  }

  return name;
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
    const message = super.message;
    const header = `Exec Failed with code=${this.code}\n  (in ${
      this.#command
    })`;

    if (message) {
      return `${header}\n\n${message}`;
    } else {
      return header;
    }
  }
}

function exec(command: string): Promise<string | undefined> {
  return new Promise((fulfill, reject) => {
    const child = shell.exec(command, { silent: true, async: true });

    const stdout = readAll(child.stdout);
    const stderr = readAll(child.stderr);

    child.on("error", (err) => reject(err));
    child.on("exit", async (code) => {
      log.silent.silent("exec status", { code, stdout: await stdout });

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

async function readAll(
  readable?: ReadableStream | null
): Promise<string | undefined> {
  if (readable === undefined || readable === null) {
    return;
  }

  const result = await new PromiseReadable(readable).readAll();

  if (result === undefined) {
    return undefined;
  } else if (typeof result === "string") {
    return result;
  } else {
    return result.toString("utf-8");
  }
}

/**
 * Used in promise-readable
 */
interface ReadableStream extends NodeJS.ReadableStream {
  closed?: boolean;
  destroyed?: boolean;
  destroy?(): void;
}
