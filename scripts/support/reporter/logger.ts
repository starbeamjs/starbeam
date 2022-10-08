import chalk from "chalk";
import { wrapIndented } from "../format.js";
import { Fragment, type FragmentImpl, type IntoFragment } from "../log.js";
import type { ReporterOptions } from "./reporter.js";

export interface FormatOptions {
  readonly multiline: boolean;
  readonly indent: number;
  readonly breakBefore: boolean;
}

export interface Header {
  message: FragmentImpl;
  options: FormatOptions;
}

interface GroupState {
  readonly status: "group";
  printed: "none" | "open" | "flat";
  header: Header | undefined;
}

export type LoggerState =
  | {
      readonly status: "top";
    }
  | GroupState;

export type LogFunction = (...args: unknown[]) => void;

const LOGGERS = {
  debug: console.debug,
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  group: console.group,
} as const;

type LOGGERS = typeof LOGGERS;
export type LoggerName = keyof LOGGERS;

export class Logger {
  static create(options: ReporterOptions): Logger {
    return new Logger(options);
  }

  #options: ReporterOptions;
  #states: LoggerState[];
  #afterEmpty = false;

  readonly loggers = LOGGERS;

  private constructor(options: ReporterOptions) {
    this.#options = options;
    this.#states = [
      {
        status: "top",
      },
    ];
  }

  get #state(): LoggerState {
    return this.#states[this.#states.length - 1];
  }

  get #groupState(): GroupState {
    const state = this.#state;

    switch (state.status) {
      case "top":
        throw Error("No open group to close");

      case "group":
        return state;
    }
  }

  #popGroupState(): GroupState {
    const state = this.#groupState;
    this.#states.pop();

    if (state.printed === "open") {
      this.logGroupEnd();
    }

    return state;
  }

  get didPrint(): boolean {
    switch (this.#state.status) {
      case "top":
        throw Error("Cannot get didPrint in top state");

      case "group":
        return this.#state.printed !== "none";
    }
  }

  ensureBlankLine(): void {
    if (this.#afterEmpty === false) {
      this.line("log", "");
    }
  }

  begin(message: FragmentImpl | undefined, options: FormatOptions): void {
    this.#states.push({
      status: "group",
      header: message && {
        message,
        options,
      },
      printed: "none",
    });
  }

  /**
   * Get the number of characters of indentation that are currently active (based on
   * `console.group`). This is used to rewrite `\x1B[NG` escape sequences to the
   * correct number of characters.
   */
  get leading(): number {
    return this.#states.filter(
      (s) => s.status === "group" && s.printed === "open"
    ).length;
  }

  /**
   * Print the group header if it has not already been printed, even if the content is empty.
   * Attempt to print the final header as a flat line (rather than a group) if possible.
   */
  printEmpty(): void {
    this.#states = this.#states.map((state) => {
      switch (state.status) {
        case "top":
          return state;
        case "group":
          this.#ensureHeader(state, "tryFlat");
          return state;
      }
    });
  }

  end(): void {
    this.#popGroupState();
  }

  async exit(code: number): Promise<never> {
    // this promise is never fulfilled, because it is blocking execution flow on process exit.
    return new Promise(() => {
      // if there are any open groups, close them
      process.stdout.once("drain", () => {
        process.exit(code);
      });
      process.stdout.write("");
    });
  }

  logGroupEnd(): void {
    console.groupEnd();
  }

  /**
   * Replace the current group header with another log. This is useful for
   * printing a one-line summary of a group instead of the header and contents.
   */
  concat(logger: LoggerName | LogFunction, message: string): void {
    const state = this.#groupState;

    if (state.printed !== "none") {
      this.line(logger, message);
    } else if (state.header) {
      state.header = {
        ...state.header,
        message: state.header.message.concat(message),
      };
    }
  }

  async raw(
    callback: (options: {
      write: (message: string) => void;
      writeln: (message: string) => void;
    }) => void
  ): Promise<void> {
    this.ensureOpen({ expect: "any" });
    return callback({
      write: (message) => this.#write(message),
      writeln: (message) => {
        this.#write(" ".repeat(this.leading) + message + "\n");
      },
    });
  }

  /**
   * Write directly to stdout. If you use this API, you must make sure you have run `ensureOpen`
   * first, and make sure a newline is printed to the console afterward.
   */
  #write(message: string): void {
    process.stdout.write(message);
  }

  line(logger: LoggerName | LogFunction, message = ""): void {
    this.ensureOpen({ expect: "any" });

    if (typeof logger === "function") {
      logger(message);
    } else {
      this.loggers[logger](message);
    }

    if (message.trim() === "") {
      this.#afterEmpty = true;
    } else {
      this.#afterEmpty = false;
    }
  }

  reportError(e: Error | IntoFragment): void {
    this.ensureOpen({ expect: "any" });

    console.log(chalk.red("An unexpected error occurred:"));

    if (e && e instanceof Error) {
      console.log(chalk.redBright(wrapIndented(e.message)));
      console.log("");
      console.group(chalk.redBright.inverse("Stack trace"));
      console.log(chalk.grey.dim(wrapIndented(e.stack ?? "")));
      console.groupEnd();
    } else {
      console.group(chalk.redBright("An unexpected error occurred:"));
      console.log(Fragment.from(e).stringify(this.#options));
      console.groupEnd();
    }
  }

  ensureOpen(options: { expect: "group" | "any" }): void {
    const state = this.#state;

    switch (state.status) {
      case "top":
        if (options.expect === "group") {
          throw Error("ASSERTION: Expected an open group, but none was found");
        } else {
          return;
        }

      case "group":
        if (state.printed !== "none") {
          return;
        }
    }

    this.#states = this.#states.map((state) => {
      switch (state.status) {
        case "top":
          return state;

        case "group": {
          this.#ensureHeader(state, "normal");
          return state;
        }
      }
    });
  }

  /**
   * Flush the current group header, if necessary.
   *
   * Normally, the header will only be flushed if the group has printed something. If `force` is
   * true, the header will be flushed regardless of whether the group has printed anything.
   *
   * If the header is flushed, any unflushed parent headers will also be flushed.
   *
   * Once a header is flushed, it is marked as printed (and `didPrint` will return true).
   */

  #ensureHeader(state: GroupState, style: "tryFlat" | "normal"): void {
    if (state.printed !== "none") {
      return;
    }

    const { header } = state;

    if (header === undefined) {
      return;
    }

    const formatted = this.#format(header);

    if (style !== "tryFlat") {
      console.group(formatted);
      this.#afterEmpty = false;
      state.printed = "open";
    } else {
      console.log(formatted);
      state.printed = "flat";
    }
  }

  #format(header: Header): string {
    return format({
      message: header.message.stringify(this.#options),
      options: header.options,
    });
  }
}

export function format({
  message,
  options,
}: {
  message: string;
  options: FormatOptions;
}): string {
  return wrapIndented(message, options.indent);
}
