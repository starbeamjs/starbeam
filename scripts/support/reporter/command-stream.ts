import { spawn } from "node-pty";
import type { Reporter } from "./reporter.js";
import { Readable } from "node:stream";
import { terminalWidth } from "../format.js";
import type { Workspace } from "../workspace.js";
import split from "split2";
import { FancyHeader } from "./fancy-header.js";
import shellSplit from "shell-split";
import type { LoggerState } from "./logger.js";
import { Fragment } from "../log.js";
import ansicolor from "ansicolor";

export type CommandOutputType = "stream" | "when-error";

export class CommandStream {
  static exec(
    workspace: Workspace,
    command: string,
    options: { cols?: number; cwd?: string; output: CommandOutputType }
  ): Promise<"ok" | "err"> {
    const parsed: string[] = shellSplit(command);
    const [cmd, ...args] = parsed;

    return new CommandStream(workspace).exec(cmd, args, options);
  }

  readonly #reporter: Reporter;
  readonly #workspace: Workspace;

  constructor(workspace: Workspace) {
    this.#workspace = workspace;
    this.#reporter = workspace.reporter;
  }

  get #defaultCwd(): string {
    return this.#workspace.root.absolute;
  }

  async exec(
    cmd: string,
    args: string[],
    {
      cols = terminalWidth(),
      cwd = this.#defaultCwd,
      output,
    }: { cols?: number; cwd?: string; output: CommandOutputType }
  ): Promise<"ok" | "err"> {
    const ptyCols = cols - (this.#reporter.leading + 2);

    const pty = PtyStream(cmd, args, {
      cols: ptyCols,
      cwd,
      output,
      state: this.#reporter.loggerState,
      transform: Transformer.list([
        normalizeNewlines,
        removeResetColumn,
        transformDeprecated,
        addLinePrefix,
      ]),
    });

    const padded = pty.stream.pipe(split(/\r?\n/));

    await this.#reporter.raw(async (writer) => {
      for await (const chunk of padded) {
        writer.write(`${ESC}[${this.#reporter.nesting * 2 + 1}G`);
        writer.writeln(chunk);
      }
    });

    return this.#reportExecStatus(pty.code);
  }

  #reportExecStatus(code: number | void): "ok" | "err" {
    if (code === undefined) {
      this.#reporter.error(`☠️ command exited without a status code`);
      return "err";
    } else if (code === 0) {
      this.#reporter.verbose((r) => {
        r.endWith({
          compact: Fragment.ok(" ok"),
          nested: FancyHeader.ok("success"),
        });
      });
      return "ok";
    } else {
      this.#reporter.verbose((r) => {
        r.endWith({
          compact: Fragment.problem(" err"),
          nested: FancyHeader.problem("error"),
        });
      });
      return "err";
    }
  }
}

function PtyStream(
  file: string,
  args: string[] | string,
  options: {
    cols: number;
    cwd: string;
    output: CommandOutputType;
    state: LoggerState;
    env?: { [key: string]: string };
    transform?: Transformer;
  }
): { readonly stream: Readable; readonly code: number | undefined } {
  const stream = new Readable({
    read() {
      /* noop */
    },
  });

  const transform = options.transform ?? ((data: string): string => data);
  const pty = spawn(file, args, options);
  let code: number | undefined = undefined;

  if (options.output === "stream") {
    pty.onData((chunk) => {
      const transformed = transform(chunk, options.state);
      if (transformed) {
        stream.push(transformed);
      }
    });

    pty.onExit(({ exitCode }) => {
      stream.push(null);
      code = exitCode;
    });
  } else {
    const buffer: string[] = [];

    pty.onData((chunk) => {
      const transformed = transform(chunk, options.state);
      if (transformed) {
        if (transformed === undefined) {
          return;
        } else if (typeof transformed === "string") {
          buffer.push(transformed);
        } else {
          buffer.push(...transformed);
        }
      }
    });

    pty.onExit(({ exitCode }) => {
      if (exitCode !== 0) {
        buffer.forEach((chunk) => stream.push(chunk));
      }
      stream.push(null);
      code = exitCode;
    });
  }

  return {
    stream,
    get code() {
      return code;
    },
  };
}

type Transformer = (
  chunk: string,
  state: LoggerState
) => string | string[] | void;

const Transformer = {
  list: (transformers: Transformer[]): Transformer => {
    return (chunk, state) => {
      let current: string[] = [chunk];

      for (const transformer of transformers) {
        const next: string[] = [];

        for (const chunk of current) {
          const transformed = transformer(chunk, state);
          if (transformed === undefined) {
            continue;
          } else if (typeof transformed === "string") {
            next.push(transformed);
          } else {
            next.push(...transformed);
          }
        }

        if (next.length === 0) {
          return;
        }

        current = next;
      }

      return current.join("\n");
    };
  },
};

const ESC = "\u001B";
const DIM = 2;
const RESET_DIM = 22;

function colorCode(code: number): string {
  return `${ESC}[${code}m`;
}

function normalizeNewlines(chunk: string): string[] {
  return chunk.replaceAll(/\r\n/g, "\n").split("\n");
}

function addLinePrefix(chunk: string, state: LoggerState): string | void {
  const everythingDimmed = chunk.replaceAll(
    /\u001B\[22m/g,
    (m) => `${ESC}${m}${colorCode(DIM)}`
  );

  if (ansicolor.strip(everythingDimmed).trim() === "") {
    return everythingDimmed;
  } else {
    return (
      colorCode(DIM) +
      Fragment.comment("| ").stringify(state) +
      everythingDimmed +
      colorCode(RESET_DIM)
    );
  }
}

function transformDeprecated(chunk: string, state: LoggerState): string | void {
  if (chunk.match(/^\s*DeprecationWarning:/)) {
    if (state.verbose) {
      return chunk.replaceAll(
        /^\s*DeprecationWarning:.*$/g,
        Fragment.comment(`  > ${chunk}`).stringify(state)
      );
    } else {
      return;
    }
  } else {
    return chunk;
  }
}

/**
 * This is not general enough for all cases, but it works for situations where a \r is immediately
 * followed by a "reset column to 0" ANSI code. Since this code already streams the output a line at
 * a time, we can remove the reset column code. This allows us to place the cursor at the beginning
 * of the logger's line (including leading).
 *
 * If this proves to be more of a problem, we probably will need to implement a more general
 * emulator for ANSI codes. That isn't much harder than what we're already doing here, but it's a
 * bit more time-consuming than I (@wycats) want to spend right now.
 */
function removeResetColumn(chunk: string): string {
  return chunk.replace(/([\u001B\u009B])[\\]?\[0?G/g, "");
}
