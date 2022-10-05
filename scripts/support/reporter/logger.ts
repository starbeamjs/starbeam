import chalk from "chalk";
import { inspect } from "node:util";
import { wrapIndented } from "../format.js";

export interface FormatOptions {
  readonly multiline: boolean;
  readonly indent: number;
  readonly breakBefore: boolean;
}

export type Header =
  | { type: "none" }
  | {
      type: "if:contents";
      message: string;
      nested: boolean;
      options: FormatOptions;
    };

interface GroupState {
  readonly status: "group";
  printed: "none" | "open" | "flat";
  header: Header;
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
  static create(): Logger {
    return new Logger();
  }

  #states: LoggerState[];

  readonly loggers = LOGGERS;

  private constructor() {
    this.#states = [
      {
        status: "top",
      },
    ];
  }

  get #state(): LoggerState {
    return this.#states[this.#states.length - 1];
  }

  #pop(): LoggerState {
    return this.#states.pop() as LoggerState;
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

  begin(header?: Header): void {
    this.#states.push({
      status: "group",
      header: header ?? { type: "none" },
      printed: "none",
    });
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

  logGroupStart(message: string): void {
    this.ensureOpen({ expect: "any" });

    console.group(message);
  }

  logGroupEnd(): void {
    console.groupEnd();
  }

  /**
   * Replace the current group header with another log. This is useful for
   * printing a one-line summary of a group instead of the header and contents.
   */
  concat(
    logger: LoggerName | LogFunction,
    message: string,
    options: FormatOptions
  ): void {
    const state = this.#groupState;

    if (state.printed !== "none") {
      this.line(logger, message);
    } else if (state.header.type !== "none") {
      state.header.message += message;
    } else {
      state.header = {
        type: "if:contents",
        message,
        nested: false,
        options,
      };
    }
  }

  line(logger: LoggerName | LogFunction, message = ""): void {
    this.ensureOpen({ expect: "any" });

    if (typeof logger === "function") {
      logger(message);
    } else {
      this.loggers[logger](message);
    }
  }

  reportError(e: unknown): void {
    this.ensureOpen({ expect: "any" });

    console.log(chalk.red("An unexpected error occurred:"));

    if (e && e instanceof Error) {
      console.log(chalk.redBright(wrapIndented(e.message)));
      console.log("");
      console.group(chalk.redBright.inverse("Stack trace"));
      console.log(chalk.grey.dim(wrapIndented(e.stack ?? "")));
      console.groupEnd();
    } else {
      console.group(chalk.redBright("A non-Error object was thrown:"));
      console.log(chalk.grey.dim(inspect(e)));
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

    if (header.type === "none") {
      return;
    }

    const formatted = this.#format(header);

    if (header.nested && style !== "tryFlat") {
      console.group(formatted);
      state.printed = "open";
    } else {
      console.log(formatted);
      state.printed = "flat";
    }
  }

  #format(header: { type: "none" }): null;
  #format(header: Header): string;
  #format(header: Header): string | null {
    switch (header.type) {
      case "none":
        return null;
      default:
        return format(header);
    }
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
