import chalk from "chalk";
import { wrapIndented } from "../format.js";
import {
  Fragment,
  type DensityChoice,
  type FragmentImpl,
  type IntoFragment,
} from "../log.js";
import { DisplayStruct } from "./inspect.js";
import type { ReporterOptions } from "./reporter.js";

export interface Header {
  message: FragmentImpl;
  breakBefore: boolean;
}

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

/**
 * `LoggerState` is the state of the logger that is needed to convert a `Fragment` into a string, or
 * to convert a raw chunk of text into a string with the correct amount of leading.
 */
export class LoggerState {
  readonly #leading: number;
  readonly #density: DensityChoice;
  readonly #verbose: boolean;

  constructor({
    leading,
    density,
    verbose,
  }: {
    leading: number;
    density: DensityChoice;
    verbose: boolean;
  }) {
    this.#leading = leading;
    this.#density = density;
    this.#verbose = verbose;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayStruct("LoggerState", {
      leading: this.#leading,
      verbose: this.#verbose,
      density: this.#density,
    });
  }

  get leading(): number {
    return this.#leading;
  }

  get leadingString(): string {
    return "  ".repeat(this.#leading);
  }

  get verbose(): boolean {
    return this.#verbose;
  }

  get density(): DensityChoice {
    return this.#density;
  }
}

interface GroupState {
  readonly status: "group";
  printed: boolean | "ended";
  nesting: number;
  header: Header | undefined;
}

export class InternalLoggerState {
  static top(options: ReporterOptions): InternalLoggerState {
    return new InternalLoggerState({ status: "top" }, options);
  }

  readonly #state: { readonly status: "top" } | GroupState;
  readonly #options: ReporterOptions;

  constructor(
    state: { readonly status: "top" } | GroupState,
    options: ReporterOptions
  ) {
    this.#state = state;
    this.#options = options;
  }

  match<T>(options: {
    top: () => T;
    group: (state: GroupState, internal: InternalLoggerState) => T;
  }): T {
    switch (this.#state.status) {
      case "top":
        return options.top();
      case "group":
        return options.group(this.#state, this);
    }
  }

  do(options: {
    top?: () => InternalLoggerState | void;
    group?: (internal: GroupState) => InternalLoggerState | void;
  }): InternalLoggerState {
    switch (this.#state.status) {
      case "top":
        return options.top?.() ?? this;
      case "group":
        return options.group?.(this.#state) ?? this;
    }
  }

  begin(
    message: Fragment | undefined,
    options: { breakBefore: boolean }
  ): InternalLoggerState {
    return new InternalLoggerState(
      {
        status: "group",
        header: message && {
          message,
          ...options,
        },
        nesting: this.leading + 1,
        printed: false,
      },
      this.#options
    );
  }

  endWith(
    {
      nested,
      compact,
      breakBefore,
    }: { nested: Fragment; compact: Fragment; breakBefore: boolean },
    ensureBreak: () => void
  ): WriteResults {
    const state = this.#state;

    if (state.status === "top") {
      throw Error(
        "Unexpected: You can only concat a header when in a group. Unless you are calling methods on Logger directly, this is a bug."
      );
    }

    if (state.printed) {
      if (breakBefore) {
        ensureBreak();
      }

      return this.#writeln(nested.stringify(this.loggerState), -1);
    }

    if (state.header) {
      const message = state.header.message.concat(compact);
      state.header = {
        ...state.header,
        message,
      };

      return this.#writeln(message.stringify(this.loggerState), -1);
    } else {
      return {
        wrote: "nothing",
      };
    }
  }

  get didPrint(): boolean {
    switch (this.#state.status) {
      case "top":
        throw Error("Cannot get didPrint in top state");

      case "group":
        return this.#state.printed !== false;
    }
  }

  /**
   * Get the number of characters of indentation that are currently active (based on
   * `console.group`). This is used to rewrite `\x1B[NG` escape sequences to the
   * correct number of characters.
   */
  get leading(): number {
    switch (this.#state.status) {
      case "top":
        return 0;
      case "group":
        return this.#state.nesting;
    }
  }

  get loggerState(): LoggerState {
    return new LoggerState({
      density: this.#options.density,
      leading: this.leading,
      verbose: this.#options.verbose,
    });
  }

  ensureHeader(ensureNewline: () => void): WriteResults {
    switch (this.#state.status) {
      case "top":
        throw Error("Cannot get header in top state");
      case "group": {
        if (this.#state.printed) {
          return { wrote: "nothing" };
        }

        const { header } = this.#state;

        if (header === undefined) {
          return { wrote: "nothing" };
        }

        this.#state.printed = true;

        if (header.breakBefore) {
          ensureNewline();
        }

        return this.#writeln(header.message, -1);
      }
    }
  }

  wroteLine(message: string): { wroteEmpty: boolean } {
    switch (this.#state.status) {
      case "top":
        return { wroteEmpty: false };
      case "group":
        this.#state.printed = true;
        return { wroteEmpty: message.trim() === "" };
    }
  }

  #format(message: IntoFragment): string {
    return format({
      message: Fragment.stringify(message, this.loggerState),
      leading: this.leading,
    });
  }

  #leadingString(leadingOffset: number): string {
    return "  ".repeat(this.leading + leadingOffset);
  }

  formatLine(message: IntoFragment): string {
    return this.#formatLine(message, 0);
  }

  #formatLine(message: IntoFragment, leadingOffset: number): string {
    if (typeof message === "string" && message.trim() === "") {
      return "";
    } else {
      return `${this.#leadingString(leadingOffset)}${this.#format(message)}`;
    }
  }

  /**
   * Write directly to stdout. If you use this API, you must make sure you have run `ensureOpen`
   * first, and make sure a newline is printed to the console afterward.
   */
  write(message: string): void {
    return this.#write(message);
  }

  writeln(message: string): { wrote: "contents" | "empty" } {
    return this.#writeln(message, 0);
  }

  #write(message: string): void {
    process.stdout.write(message);
  }

  #writeln(
    message: IntoFragment,
    leadingOffset: number
  ): { wrote: "contents" | "empty" } {
    this.#write(this.#formatLine(message, leadingOffset) + "\n");

    return {
      wrote: Fragment.isEmpty(message, this.loggerState) ? "empty" : "contents",
    };
  }
}

interface LoggerActions {
  ensureNewline: (this: void) => void;
  wrote: (this: void, results: WriteResults) => void;
}

class States {
  static create(options: ReporterOptions, actions: LoggerActions): States {
    return new States([InternalLoggerState.top(options)], actions);
  }

  #states: InternalLoggerState[];
  readonly #actions: LoggerActions;

  constructor(states: InternalLoggerState[], actions: LoggerActions) {
    this.#states = states;
    this.#actions = actions;
  }

  get #current(): InternalLoggerState {
    return this.#states[this.#states.length - 1];
  }

  get current(): LoggerState {
    return this.#current.loggerState;
  }

  get leading(): number {
    return this.#current.leading;
  }

  get didPrint(): boolean {
    return this.#current.didPrint;
  }

  write(message: string): void {
    this.#current.write(message);
  }

  writeln(message: string): void {
    this.ensureOpen({ expect: "any" });

    return this.#actions.wrote(this.#current.writeln(message));
  }

  writelnRaw(message: string): void {
    this.ensureOpen({ expect: "any" });

    this.#current.write(message + "\n");

    if (message.trim() !== "") {
      this.#actions.wrote({ wrote: "contents" });
    }
  }

  logln(message: string, logger: LoggerName | LogFunction = console.log): void {
    this.ensureOpen({ expect: "any" });

    const line = this.#current.formatLine(message);

    const loggerFn = typeof logger === "string" ? LOGGERS[logger] : logger;
    loggerFn(line);

    this.#actions.wrote(
      line.trim() === "" ? { wrote: "empty" } : { wrote: "contents" }
    );
  }

  begin(message: Fragment | undefined, options: { breakBefore: boolean }) {
    this.#states.push(this.#current.begin(message, options));
  }

  end(): void {
    this.#states.pop();
  }

  endWith(
    logger: LoggerName | LogFunction,
    {
      nested,
      compact,
      breakBefore,
    }: { nested: Fragment; compact: Fragment; breakBefore: boolean }
  ): void {
    const needsFlush = this.#needsFlush({ expect: "group" });

    if (needsFlush) {
      this.#flushParents();
      this.#current.endWith(
        {
          nested,
          compact,
          breakBefore,
        },
        this.#actions.ensureNewline
      );
    } else {
      this.#actions.wrote(
        this.#current.writeln(nested.stringify(this.#current.loggerState))
      );
    }
  }

  #needsFlush({ expect }: { expect: "group" | "any" }): boolean {
    const state = this.#current;

    return state.match({
      top: () => {
        if (expect === "group") {
          throw Error(
            "Expected to be in a group, but was at the top level. If you didn't call logger methods directly, this is a bug."
          );
        }
        return false;
      },
      group: (group) => !group.printed,
    });
  }

  #flushParents() {
    const parents = [...this.#states.slice(0, -1)].map((state) =>
      state.do({
        group: () => this.#flushHeader(state),
      })
    );

    this.#states = [...parents, this.#current];
  }

  ensureOpen({ expect }: { expect: "group" | "any" }): void {
    if (this.#needsFlush({ expect })) {
      this.#flushParents();
      this.#flushHeader(this.#current);
    }
  }

  #flushHeader(state: InternalLoggerState): void {
    this.#actions.wrote(state.ensureHeader(this.#actions.ensureNewline));
  }
}

export class Logger {
  static create(options: ReporterOptions): Logger {
    return new Logger(options);
  }

  #states: States;
  #afterEmpty = false;

  readonly loggers = LOGGERS;

  private constructor(options: ReporterOptions) {
    this.#states = States.create(options, {
      ensureNewline: this.#ensureBreak,
      wrote: this.#wrote,
    });
  }

  get state(): LoggerState {
    return this.#states.current;
  }

  get leading(): number {
    return this.#states.leading;
  }

  get didPrint(): boolean {
    return this.#states.didPrint;
  }

  ensureBreak(): void {
    this.#ensureBreak();
  }

  /**
   * Print the group header if it has not already been printed, even if the content is empty.
   */
  printEmpty(): void {
    this.#states.ensureOpen({ expect: "group" });
  }

  #wrote = (results: WriteResults): void => {
    if (results.wrote === "contents") {
      this.#afterEmpty = false;
    } else if (results.wrote === "empty") {
      this.#afterEmpty = true;
    }
  };

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

  begin(
    message: FragmentImpl | undefined,
    options: { breakBefore: boolean } = { breakBefore: false }
  ): void {
    return this.#states.begin(message, options);
  }

  end(): void {
    this.#states.end();
  }

  /**
   * If the group has not printed anything, then append the final message to
   * the header and print it. Otherwise, print it like a normal line.
   *
   * Either way, end the group.
   */
  endWith(
    logger: LoggerName | LogFunction,
    {
      nested,
      compact,
      breakBefore,
    }: { nested: Fragment; compact: Fragment; breakBefore: boolean }
  ): void {
    this.#states.endWith(logger, { nested, compact, breakBefore });
  }

  async raw(
    callback: (options: {
      write: (message: string) => void;
      writeln: (message: string) => void;
    }) => void
  ): Promise<void> {
    return callback({
      write: (message) => this.#states.write(message),
      writeln: (message) => this.#states.writelnRaw(message),
    });
  }

  #ensureBreak = (): void => {
    if (!this.#afterEmpty) {
      process.stdout.write("\n");
      this.#afterEmpty = true;
    }
  };

  logln(message = "", logger: LoggerName | LogFunction = console.log): void {
    this.#states.ensureOpen({ expect: "any" });
    this.#states.logln(message, logger);
  }

  reportError(e: Error | IntoFragment): void {
    this.#states.ensureOpen({ expect: "any" });

    this.#states.logln(chalk.red("An unexpected error occurred:"));

    if (e && e instanceof Error) {
      this.#states.logln(chalk.redBright(wrapIndented(e.message)));
      this.#states.logln("");
      this.#states.logln(chalk.redBright.inverse("Stack trace"), console.group);
      this.#states.logln(chalk.grey.dim(wrapIndented(e.stack ?? "")));
      console.groupEnd(); // intentionally manual
    } else {
      this.#states.logln(
        chalk.redBright("An unexpected error occurred:"),
        console.group
      );
      this.#states.logln(Fragment.from(e).stringify(this.state));
      console.groupEnd(); // intentionally manual
    }
  }

  ensureOpen({ expect }: { expect: "any" | "group" }): void {
    this.#states.ensureOpen({ expect });
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
}

export function format({
  message,
  leading,
}: {
  message: string;
  leading: number;
}): string {
  return wrapIndented(message, leading);
}

interface WriteResults {
  wrote: "nothing" | "contents" | "empty";
  flush?: boolean;
}
