import { execSync, type ExecSyncOptions } from "node:child_process";
import { relative, resolve } from "node:path";
import { comment, header, log } from "./log.js";

export class Workspace {
  readonly #root: string;

  constructor(root: string) {
    this.#root = root;
  }

  get root(): string {
    return this.#root;
  }

  exec(
    command: string,
    options?: Partial<ExecSyncOptions & { failFast: boolean }>
  ): "ok" | "err" {
    try {
      execSync(command, { cwd: this.#root, stdio: "inherit", ...options });
      return "ok";
    } catch {
      if (options?.failFast) {
        log(`\n> ${comment("failed")} ${header(command)}\n`);
        process.exit(1);
      }
      return "err";
    }
  }

  resolve(...paths: string[]): string {
    return resolve(this.#root, ...paths);
  }

  relative(path: string): string {
    return relative(this.#root, path);
  }
}
