import chalk from "chalk";
import { execSync, type ExecSyncOptions } from "node:child_process";
import { wrapIndented } from "./format.js";
import { comment, header, log } from "./log.js";
import {
  Directory,
  Glob,
  Paths,
  type GlobOptions,
  type Path,
} from "./paths.js";

export class Workspace {
  static root(root: string, verbose: boolean): Workspace {
    return new Workspace(Paths.root(root), verbose);
  }

  readonly #verbose: boolean;
  readonly #paths: Paths;

  constructor(paths: Paths, verbose: boolean) {
    this.#paths = paths;
    this.#verbose = verbose;
  }

  get root(): Directory {
    return this.#paths.root;
  }

  get paths(): Paths {
    return this.#paths;
  }

  glob(path: string, options?: GlobOptions): Glob {
    return this.root.glob(path, options);
  }

  cmd(
    command: string,
    options?: Partial<ExecSyncOptions & { failFast: boolean }>
  ): string {
    if (this.#verbose) {
      log(`> running <`, chalk.redBright.bold);
      log(wrapIndented(`$ ${command}`, 2), comment);
    }

    try {
      return execSync(command, {
        cwd: this.root,
        ...options,
        encoding: "utf-8",
      });
    } catch (e) {
      if (options?.failFast) {
        log(`\n> ${comment("failed")} ${header(command)}\n`);
        process.exit(1);
      }
      throw e;
    }
  }

  exec(
    command: string,
    options?: Partial<ExecSyncOptions & { failFast: boolean }>
  ): "ok" | "err" {
    if (this.#verbose) {
      log(`> running <`, chalk.redBright.bold);
      log(wrapIndented(`$ ${command}`, 2), comment);
    }

    try {
      execSync(command, { cwd: this.root, stdio: "inherit", ...options });
      return "ok";
    } catch {
      if (options?.failFast) {
        log(`\n> ${comment("failed")} ${header(command)}\n`);
        process.exit(1);
      }
      return "err";
    }
  }

  dir(path: string): Directory {
    return this.#paths.root.dir(path);
  }

  relative(path: string | Path): string {
    if (typeof path === "string") {
      return this.dir(path).relativeFrom(this.root);
    } else {
      return path.relativeFrom(this.root);
    }
  }
}
