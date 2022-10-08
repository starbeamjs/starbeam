import { spawn } from "node-pty";
import {
  Directory,
  Glob,
  Paths,
  type GlobOptions,
  type Path,
} from "./paths.js";
import { Reporter, type ReporterOptions } from "./reporter/reporter.js";
import { Readable } from "node:stream";
import {
  execSync,
  type ExecSyncOptionsWithStringEncoding,
} from "child_process";
import { terminalWidth } from "./format.js";
import split from "split2";
import shellSplit from "shell-split";
import { Fragment, type IntoFragment } from "./log.js";
import { CheckResults, Checks, GroupedCheckResults } from "./checks.js";
import { FancyHeader } from "./reporter/fancy-header.js";

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

  async cmd(
    command: string,
    options?: Partial<ExecSyncOptionsWithStringEncoding & { failFast: boolean }>
  ): Promise<string | void> {
    return await this.#reporter.handle
      .fatal((r) =>
        r.log(
          `> ${Fragment.problem.header.inverse(
            "failed"
          )} ${Fragment.problem.header(command)}`
        )
      )
      .try((r) => {
        r.verbose(() => {
          r.log(`$ ${command}`);
          r.log("");
        });

        return execSync(command, {
          cwd: this.root.absolute,
          encoding: "utf8",
          ...options,
        });
      });
  }

  async checks<T>(
    groupedChecks: Map<T, CheckDefinition[]>,
    options: {
      label: (value: T) => string;
      header: (value: T) => IntoFragment;
    }
  ): Promise<GroupedCheckResults> {
    const grouped = GroupedCheckResults.empty();
    const reporter = this.reporter;

    for (const [value, definitions] of groupedChecks.entries()) {
      reporter.ensureBlankLine();

      await reporter.group(options.header(value)).tryAsync(async (r) => {
        r.ensureBlankLine();
        const results = await this.check(...definitions);
        grouped.add(options.label(value), results);
      });
    }

    return grouped;
  }

  async check(...checks: CheckDefinition[]): Promise<CheckResults> {
    const runner = new Checks(this, this.#paths.root);

    for (const check of checks) {
      await runner.exec(...check);
    }

    return runner.statuses;
  }

  async exec(
    command: string,
    options: { cwd: string } = { cwd: this.root.absolute }
  ): Promise<"ok" | "err"> {
    const parsed: string[] = shellSplit(command);
    const [cmd, ...args] = parsed;

    return this.#reporter
      .group(Fragment.comment(`$ ${command}`))
      .verbose("header")
      .fatal((r) =>
        r.log(`> ${Fragment.problem("failed")} ${Fragment.comment(command)}`)
      )
      .catch((_): "ok" | "err" => "err")
      .tryAsync(async () => await this.#execWithPty(cmd, args, options));
  }

  #reportExecStatus(code: number | void): "ok" | "err" {
    if (code === undefined) {
      this.#reporter.error(`☠️ command exited without a status code`);
      return "err";
    } else if (code === 0) {
      this.#reporter.verbose((r) => {
        r.ensureBlankLine();
        r.log(FancyHeader.ok("success"));
        r.log("");
      });
      return "ok";
    } else {
      this.#reporter.verbose((r) => {
        r.ensureBlankLine();
        r.log(FancyHeader.problem("failed"));
        r.log("");
      });
      return "err";
    }
  }

  async #execWithPty(
    cmd: string,
    args: string[],
    options: { cwd: string }
  ): Promise<"ok" | "err"> {
    this.#reporter.ensureOpen();

    const pty = PtyStream(cmd, args, {
      cols: terminalWidth(),
      cwd: options.cwd ?? this.root.absolute,
    });

    const padded = pty.stream.pipe(split());

    await this.#reporter.raw(async ({ writeln, write }) => {
      for await (const chunk of padded) {
        const string = chunk.toString("utf8") as string;

        const rewritten = string.replace(
          /([\u001B\u009B])[\\]?\[(\d*)G/g,
          (m, esc, n) => {
            const leading = Number(n || "0") + this.#reporter.leading;
            if (this.#reporter.leading) {
              return `${esc}[0G${" ".repeat(leading)}`;
            } else {
              return m;
            }
          }
        );

        writeln(rewritten);
      }
    });

    // const match = string.match(/[\u001B\u009B][\\]?\[(?<n>\d*)G/u);

    // if (match) {
    //   console.log({ match: match[0].replace(/[\u001B\u009B]/g, "<ESC>") });
    // }

    // if (string.match(/[\u001B\u009B][\\]?\[(?<n>\d*)G/u)) {
    //   console.log({ string: JSON.stringify(string) });
    // }

    // console.log(rewritten);

    // const line = anser.ansiToJson(chunk, { json: true });
    // if (line.some((part) => part.content.includes(".spec.ts"))) {
    //   console.log({ line });
    // }
    // this.#reporter.log(chunk);

    this.#reporter.log("");
    return this.#reportExecStatus(pty.code);
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

export type CheckDefinition = [
  label: string,
  command: string,
  options?: { cwd: Directory }
];

export function CheckDefinition(
  label: string,
  command: string,
  options?: { cwd: Directory }
): CheckDefinition {
  return [label, command, options] as CheckDefinition;
}
