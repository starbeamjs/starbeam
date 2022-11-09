import { getLast, withoutLast } from "@starbeam/core-utils";
import chalk from "chalk";

import { wrapIndented } from "../format.js";
import {
  type DensityChoice,
  type FragmentImpl,
  type IntoFragment,
  Fragment,
} from "../log.js";
import { DisplayStruct } from "./inspect.js";
import type { LoggerEndWith, ReporterOptions } from "./reporter.js";

export interface Header {
  message: Fragment;
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

const INCREMENT_NESTING = 1;

abstract class InternalLoggerState {
  static top(options: ReporterOptions): InternalLoggerState {
    return new InternalLoggerTopState(options);
  }

  readonly #options: ReporterOptions;

  constructor(options: ReporterOptions) {
    this.#options = options;
  }

  abstract readonly leading: number;
  abstract readonly didPrint: boolean;

  abstract needsFlush({ expect }: { expect: "group" | "any" }): boolean;
  abstract ensureHeader(ensureNewline: () => void): WriteResults;

  abstract do(options: {
    top?: () => InternalLoggerState | void;
    group?: (internal: GroupState) => InternalLoggerState | void;
  }): InternalLoggerState;

  get loggerState(): LoggerState {
    return new LoggerState({
      density: this.#options.density,
      leading: this.leading,
      verbose: this.#options.verbose,
    });
  }

  /**
   * Write directly to stdout. If you use this API, you must make sure you have run `ensureOpen`
   * first, and make sure a newline is printed to the console afterward.
   */
  write(message: string): void {
    this.#write(message);
  }

  writeln(message: IntoFragment): { wrote: "contents" | "empty" } {
    return this.#writeln(message);
  }

  #write(message: string): void {
    process.stdout.write(message);
  }

  #writeln(message: IntoFragment): { wrote: "contents" | "empty" } {
    this.#write(this.#formatLine(message) + "\n");

    return {
      wrote: Fragment.isEmpty(message, this.loggerState) ? "empty" : "contents",
    };
  }

  formatLine(message: IntoFragment): string {
    return this.#formatLine(message);
  }

  #formatLine(message: IntoFragment): string {
    if (typeof message === "string" && message.trim() === "") {
      return "";
    } else {
      return `${this.#leadingString}${this.#format(message)}`;
    }
  }

  #format(message: IntoFragment): string {
    return format({
      message: Fragment.stringify(message, this.loggerState),
      leading: this.leading,
    });
  }

  get #leadingString(): string {
    return "  ".repeat(this.leading);
  }

  begin(
    message: Fragment | undefined,
    options: { breakBefore: boolean }
  ): InternalLoggerState {
    return new InternalLoggerGroupState(
      {
        status: "group",
        header: message && {
          message,
          ...options,
        },
        nesting: this.leading + INCREMENT_NESTING,
        printed: false,
      },
      this.#options,
      this
    );
  }

  abstract endWith(
    endWith: LoggerEndWith,
    actions: {
      logln: (this: void, message: string) => void;
      ensureNewline: (this: void) => void;
      flush: (this: void) => void;
    }
  ): void;
}

class InternalLoggerGroupState extends InternalLoggerState {
  readonly #state: GroupState;
  readonly #options: ReporterOptions;
  readonly #parent: InternalLoggerState;

  constructor(
    state: GroupState,
    options: ReporterOptions,
    parent: InternalLoggerState
  ) {
    super(options);
    this.#state = state;
    this.#options = options;
    this.#parent = parent;
  }

  get leading(): number {
    return this.#state.nesting;
  }

  get didPrint(): boolean {
    return this.#state.printed !== false;
  }

  needsFlush(): boolean {
    return this.#state.printed === false;
  }

  override endWith(
    { nested, compact }: LoggerEndWith,
    actions: { logln: (message: string) => void; ensureNewline: () => void }
  ): void {
    const state = this.#state;

    if (state.printed) {
      if (nested === undefined) {
        return;
      }

      if (nested.breakBefore) {
        actions.ensureNewline();
      }

      actions.logln(this.formatLine(nested.fragment));
    } else if (state.header) {
      if (compact === undefined) {
        return;
      }

      const message = compact.replace
        ? compact.fragment
        : state.header.message.concat(compact.fragment);

      state.header = { ...state.header, message };

      if (compact.breakBefore) {
        actions.ensureNewline();
      }

      actions.logln(this.#parent.formatLine(message));
      state.printed = "ended";
    }
  }

  override ensureHeader(ensureNewline: () => void): WriteResults {
    const { header, printed } = this.#state;

    if (printed || header === undefined) {
      return { wrote: "nothing" };
    }

    this.#state.printed = true;

    if (header.breakBefore) {
      ensureNewline();
    }

    return this.#parent.writeln(header.message);
  }

  override do(options: {
    top?: () => InternalLoggerState | void;
    group?: (internal: GroupState) => InternalLoggerState | void;
  }): InternalLoggerState {
    return options.group?.(this.#state) ?? this;
  }
}

class InternalLoggerTopState extends InternalLoggerState {
  readonly #options: ReporterOptions;

  readonly leading = 0;

  constructor(options: ReporterOptions) {
    super(options);
    this.#options = options;
  }

  get didPrint(): never {
    throw Error("Cannot get didPrint in top state");
  }

  override endWith(): void {
    throw Error(
      "Unexpected: You can only update a header when in a group. Unless you are calling methods on Logger directly, this is a bug."
    );
  }

  override needsFlush({ expect }: { expect: "group" | "any" }): boolean {
    if (expect === "group") {
      throw Error(
        "Unexpected: You can only flush a group when in a group. Unless you are calling methods on Logger directly, this is a bug."
      );
    }

    return false;
  }

  override ensureHeader(): WriteResults {
    throw Error("Cannot ensure header in top state");
  }

  override do(options: {
    top?: () => InternalLoggerState | void;
    group?: (internal: GroupState) => InternalLoggerState | void;
  }): InternalLoggerState {
    return options.top?.() ?? this;
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
    const state = getLast(this.#states);

    if (state === undefined) {
      throw Error("FATAL BUG: The logger doesn't have an internal state");
    }

    return state;
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

    this.#actions.wrote(this.#current.writeln(message));
  }

  writelnRaw(message: string): void {
    this.ensureOpen({ expect: "any" });

    this.#current.write(message + "\n");

    if (message.trim() !== "") {
      this.#actions.wrote({ wrote: "contents" });
    }
  }

  #logFn(logger: LoggerName | LogFunction): LogFunction {
    return typeof logger === "string" ? LOGGERS[logger] : logger;
  }

  #logln(message: string, logger: LoggerName | LogFunction): void {
    this.ensureOpen({ expect: "any" });

    this.#logFn(logger)(message);

    this.#actions.wrote(
      Fragment.isEmpty(message, this.#current.loggerState)
        ? { wrote: "empty" }
        : { wrote: "contents" }
    );
  }

  logln(
    message: IntoFragment,
    logger: LoggerName | LogFunction = console.log
  ): void {
    const loggerFn = typeof logger === "string" ? LOGGERS[logger] : logger;
    this.#logln(this.#current.formatLine(message), loggerFn);
  }

  begin(
    message: Fragment | undefined,
    options: { breakBefore: boolean }
  ): void {
    this.#states.push(this.#current.begin(message, options));
  }

  end(): void {
    this.#states.pop();
  }

  endWith(logger: LoggerName | LogFunction, endWith: LoggerEndWith): void {
    const needsFlush = this.#current.needsFlush({ expect: "group" });

    if (needsFlush) {
      this.#flushParents();
    }

    this.#current.endWith(endWith, {
      ensureNewline: this.#actions.ensureNewline,
      logln: (message: string) => {
        this.#logFn(logger)(message);

        this.#actions.wrote(
          Fragment.isEmpty(message, this.#current.loggerState)
            ? { wrote: "empty" }
            : { wrote: "contents" }
        );
      },
      flush: () => {
        this.#flushParents();
      },
    });

    // this.#current.endWith({
    //   nested,
    //   compact,
    // });

    // } else {
    //   if (nested.breakBefore) {
    //     this.#actions.ensureNewline();
    //   }

    //   this.#actions.wrote(
    //     this.#current.writeln(
    //       nested.fragment.stringify(this.#current.loggerState)
    //     )
    //   );
    // }
  }

  #flushParents = (): void => {
    const parents = [...withoutLast(this.#states)].map((state) =>
      state.do({
        group: () => {
          this.#flushHeader(state);
        },
      })
    );

    this.#states = [...parents, this.#current];
  };

  ensureOpen({ expect }: { expect: "group" | "any" }): void {
    if (this.#current.needsFlush({ expect })) {
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

  exit(code: number): never {
    process.exit(code);
  }

  begin(
    message: FragmentImpl | undefined,
    options: { breakBefore: boolean } = { breakBefore: false }
  ): void {
    this.#states.begin(message, options);
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
    { nested, compact }: LoggerEndWith
  ): void {
    this.#states.endWith(logger, { nested, compact });
  }

  async raw(
    callback: (options: {
      write: (message: string) => void;
      writeln: (message: string) => void;
    }) => void | Promise<void>
  ): Promise<void> {
    await callback({
      write: (message) => {
        this.#states.write(message);
      },
      writeln: (message) => {
        this.#states.writelnRaw(message);
      },
    });
  }

  #ensureBreak = (): void => {
    if (!this.#afterEmpty) {
      process.stderr.write("\n");
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
