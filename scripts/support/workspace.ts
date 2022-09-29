import chalk from "chalk";
import { spawn } from "node-pty";
import { comment, header } from "./log.js";
import {
  Directory,
  Glob,
  Paths,
  type GlobOptions,
  type Path,
} from "./paths.js";
import { Reporter, type ReporterOptions } from "./reporter.js";
import { Readable } from "node:stream";
import {
  execSync,
  type ExecSyncOptionsWithStringEncoding,
} from "child_process";
import { terminalWidth } from "./format.js";
import split from "split2";
import shellSplit from "shell-split";

export class Workspace {
  static root(root: string, options: ReporterOptions): Workspace {
    return new Workspace(Paths.root(root), options);
  }

  readonly #verbose: boolean;
  readonly #stylish: boolean;
  readonly #paths: Paths;
  readonly #reporter: Reporter;

  constructor(paths: Paths, options: ReporterOptions) {
    this.#paths = paths;
    this.#verbose = options.verbose;
    this.#stylish = options.stylish;
    this.#reporter = Reporter.root(this, options);
  }

  get root(): Directory {
    return this.#paths.root;
  }

  get paths(): Paths {
    return this.#paths;
  }

  get reporter(): Reporter {
    return this.#reporter;
  }

  glob(path: string, options?: GlobOptions): Glob {
    return this.root.glob(path, options);
  }

  cmd(
    command: string,
    options?: Partial<ExecSyncOptionsWithStringEncoding & { failFast: boolean }>
  ): Promise<string | void> {
    return this.#reporter.handle
      .fatal((r) =>
        r.section((r) =>
          r.log(
            chalk.red.bold(
              `> ${chalk.redBright.inverse("failed")} ${header(command)}`
            )
          )
        )
      )
      .try(async (r) => {
        r.verbose(() => {
          r.log(comment(`$ ${command}`));
          r.log("");
        });

        return execSync(command, {
          cwd: this.root.absolute,
          encoding: "utf8",
          ...options,
        });
      });
  }

  async exec(
    command: string,
    options: { cwd: string } = { cwd: this.root.absolute }
  ): Promise<"ok" | "err"> {
    const parsed: string[] = shellSplit(command);
    const [cmd, ...args] = parsed;

    return this.#reporter.handle
      .fatal((r) =>
        r.section((r) =>
          r.log(
            chalk.red.bold(
              `> ${chalk.redBright.inverse("failed")} ${header(command)}`
            )
          )
        )
      )
      .catch((_): "ok" | "err" => "err")
      .try(async (r): Promise<"ok" | "err"> => {
        r.verbose(() => {
          r.section((r) => r.log(comment(`$ ${command}`)), { break: "after" });
        });

        r.flush();

        const pty = PtyStream(cmd, args, {
          cols: terminalWidth(),
          cwd: options.cwd ?? this.root.absolute,
        });

        const padded = pty.stream.pipe(split());

        for await (const chunk of padded) {
          r.log(chunk);
        }

        if (pty.code === undefined) {
          throw new Error("pty exited without a code");
        } else if (pty.code === 0) {
          this.#reporter.verbose((r) => {
            r.log(chalk.green("✅"));
            r.log("");
          });
          return "ok";
        } else {
          this.#reporter.verbose((r) => {
            r.log(chalk.red.bold("❌"));
            r.log("");
          });
          return "err";
        }
      });
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

function PtyStream(
  file: string,
  args: string[] | string,
  options: {
    cols: number;
    cwd: string;
    env?: { [key: string]: string };
  }
): { readonly stream: Readable; readonly code: number | undefined } {
  const stream = new Readable({
    read() {
      /* noop */
    },
  });
  const pty = spawn(file, args, options);
  let code: number | undefined = undefined;

  pty.onData((data) => {
    stream.push(data);
  });

  pty.onExit(({ exitCode }) => {
    stream.push(null);
    code = exitCode;
  });

  return {
    stream,
    get code() {
      return code;
    },
  };
}
