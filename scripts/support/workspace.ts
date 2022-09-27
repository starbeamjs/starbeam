import { execSync, type ExecSyncOptions } from "node:child_process";
import { comment, header, log } from "./log.js";
import {
  Directory,
  Glob,
  Paths,
  type GlobOptions,
  type Path,
} from "./paths.js";

export class Workspace {
  static root(root: string): Workspace {
    return new Workspace(Paths.root(root));
  }

  readonly #paths: Paths;

  constructor(paths: Paths) {
    this.#paths = paths;
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

  exec(
    command: string,
    options?: Partial<ExecSyncOptions & { failFast: boolean }>
  ): "ok" | "err" {
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
