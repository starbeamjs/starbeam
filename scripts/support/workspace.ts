import {
  Directory,
  Glob,
  Paths,
  type GlobOptions,
  type Path,
} from "./paths.js";
import { Reporter, type ReporterOptions } from "./reporter/reporter.js";
import {
  execSync,
  type ExecSyncOptionsWithStringEncoding,
} from "child_process";
import { Fragment, type IntoFragment } from "./log.js";
import { CheckResults, Checks, GroupedCheckResults } from "./checks.js";
import {
  CommandStream,
  type CommandOutputType,
} from "./reporter/command-stream.js";

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

  stringify(fragment: Fragment): string {
    return this.#reporter.stringify(fragment);
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
      await reporter
        .group(options.header(value))
        .breakBefore()
        .tryAsync(async (r) => {
          const results = await this.check(...definitions);
          grouped.add(options.label(value), results);

          if (!r.didPrint) {
            r.log(
              grouped.isOk
                ? Fragment.ok.inverse("ok")
                : Fragment.problem.inverse("err")
            );
          }
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
    {
      cwd,
      label,
      output,
      breakBefore,
    }: {
      cwd: string;
      label?: string;
      breakBefore: boolean;
      output: CommandOutputType;
    } = {
      cwd: this.root.absolute,
      output: "stream",
      breakBefore: false,
    }
  ): Promise<"ok" | "err"> {
    const header = label
      ? Fragment.header(label)
      : Fragment.comment(`$ ${command}`);

    const groupVerbosity = label === undefined ? "header" : false;
    const verboseInnerHeader =
      label && this.#reporter.isVerbose
        ? Fragment.comment(`$ ${command}`)
        : undefined;

    return this.#reporter
      .group(header)
      .verbose(groupVerbosity)
      .breakBefore(breakBefore)
      .fatal((r) => {
        if (verboseInnerHeader) {
          r.log(verboseInnerHeader);
        }
        r.log(`> ${Fragment.problem("failed")} ${Fragment.comment(command)}`);
      })
      .catch((_, log) => {
        log();
        return "err" as const;
      })
      .tryAsync(async () => {
        return await CommandStream.exec(this, command, { cwd, output });
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

export interface ExecOptions {
  cwd: Directory;
  output?: CommandOutputType;
}

export type CheckDefinition = [
  label: string,
  command: string,
  options?: ExecOptions
];

export function CheckDefinition(
  label: string,
  command: string,
  options?: { cwd: Directory; output: CommandOutputType }
): CheckDefinition {
  return [label, command, options] as CheckDefinition;
}
