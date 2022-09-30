import chalk from "chalk";
import { inspect } from "util";
import { wrapIndented } from "./format.js";
import type { Workspace } from "./workspace.js";

export interface ReporterOptions {
  readonly verbose: boolean;
  readonly stylish: boolean;
  readonly failFast: boolean;
}

export interface FormatOptions {
  readonly multiline: boolean;
  readonly indent: number;
  readonly breakBefore: boolean;
}

export type Header =
  | { type: "none" }
  | {
      type: "always";
      header: string;
      empty: string;
      nested: boolean;
    }
  | {
      type: "if:contents";
      header: string;
      nested: boolean;
    };

class Logger {
  #state:
    | {
        status: "top:start";
      }
    | {
        status: "top:printed";
      }
    | {
        status: "pending";
        didPrint: boolean;
        buffers: Header[];
        open: Header[];
      }
    | { status: "logged"; open: Header[] } = {
    status: "top:start",
  };

  begin(header: Header) {
    switch (this.#state.status) {
      case "top:start":
      case "top:printed":
        this.#state = {
          status: "pending",
          buffers: [header],
          open: [],
          didPrint: this.#state.status === "top:printed",
        };
        break;
      case "pending":
        this.#state.buffers.push(header);
        break;
      case "logged":
        this.#state = {
          status: "pending",
          buffers: [header],
          open: this.#state.open,
          didPrint: true,
        };
        break;
    }
  }

  end(options: FormatOptions) {
    switch (this.#state.status) {
      case "top:start":
      case "top:printed":
        throw Error(
          `ASSERT: No open group to close (in ${this.#state.status} state)`
        );
      case "logged": {
        const open = this.#state.open;
        const last = open.pop();

        if (last === undefined) {
          throw Error("ASSERT: No open group to close (in logged state)");
        }

        if (last.type !== "none" && last.nested) {
          console.groupEnd();
        }

        if (open.length === 0) {
          this.#state = {
            status: "top:printed",
          };
        }

        break;
      }

      case "pending": {
        const { buffers, open } = this.#state;

        const header = buffers.pop();

        if (header === undefined) {
          throw Error("ASSERT: No pending groups to close");
        }

        switch (header.type) {
          case "always":
            if (header.nested) {
              console.group(this.format(header.header, options));
              if (header.empty) {
                console.log(header.empty);
              }
              console.groupEnd();

              this.#state.didPrint = true;
            }

            break;
          case "if:contents":
            break;
        }

        if (buffers.length === 0) {
          if (open.length === 0) {
            this.#state = this.#state.didPrint
              ? { status: "top:printed" }
              : { status: "top:start" };
          } else {
            this.#state = { status: "logged", open };
          }
        }
      }
    }
  }

  get didPrint() {
    switch (this.#state.status) {
      case "top:start":
        return false;
      case "top:printed":
      case "logged":
        return true;
      case "pending":
        return this.#state.didPrint;
    }
  }

  flush(options: FormatOptions): boolean {
    switch (this.#state.status) {
      case "top:start":
        this.#state = { status: "top:printed" };
        return false;
      case "top:printed":
      case "logged":
        return false;
      case "pending": {
        const { buffers, open } = this.#state;

        for (const buffer of buffers) {
          if (buffer.type === "none") {
            continue;
          } else if (buffer.nested) {
            console.group(this.format(buffer.header, options));
          } else {
            console.log(this.format(buffer.header, options));
          }
        }

        this.#state = {
          status: "logged",
          open: [...open, ...buffers],
        };

        return true;
      }
    }
  }

  format(message: string, options: FormatOptions) {
    return wrapIndented(message, options.indent);
  }
}

export class Reporter {
  static root(workspace: Workspace, options: ReporterOptions): Reporter {
    return new Reporter(
      workspace,
      options,
      {
        multiline: false,
        indent: 0,
        breakBefore: false,
      },
      null,
      new Logger()
    );
  }

  readonly #workspace: Workspace;
  readonly #options: ReporterOptions;
  readonly #formatOptions: FormatOptions;
  readonly #parent: Reporter | null;
  readonly #logger: Logger;
  #didPrint = false;

  private constructor(
    workspace: Workspace,
    options: ReporterOptions,
    format: FormatOptions,
    parent: null,
    logger: Logger
  );
  private constructor(
    workspace: Workspace,
    options: ReporterOptions,
    format: FormatOptions,
    parent: Reporter
  );
  private constructor(
    workspace: Workspace,
    options: ReporterOptions,
    format: FormatOptions,
    parent: Reporter | null,
    logger?: Logger
  ) {
    this.#workspace = workspace;
    this.#options = options;
    this.#formatOptions = format;
    this.#parent = parent;

    if (parent) {
      this.#logger = parent.#logger;
    } else {
      this.#logger = logger as Logger;
    }
  }

  fallible<T, U>(options: {
    setup?: (reporter: Reporter) => void;
    try: (reporter: Reporter) => Promise<T>;
    catch: (reporter: Reporter, log: () => void) => U;
    finally?: (reporter: Reporter) => void;
    fatal?: (reporter: Reporter) => never;
  }): Promise<T | U>;
  fallible<T, U, F>(options: {
    setup?: (reporter: Reporter) => void;
    try: (reporter: Reporter) => Promise<T>;
    catch: (reporter: Reporter, log: () => void) => U;
    finally: (reporter: Reporter) => F;
    fatal?: (reporter: Reporter) => never;
  }): Promise<T | U | F>;
  fallible(options: {
    setup?: (reporter: Reporter) => void;
    try: (reporter: Reporter) => Promise<unknown> | unknown;
    catch?: (reporter: Reporter, log: () => void) => unknown;
    finally?: (reporter: Reporter) => unknown;
    fatal?: (reporter: Reporter) => never;
  }): Promise<unknown>;
  async fallible(options: {
    setup?: (reporter: Reporter) => void;
    try: (reporter: Reporter) => Promise<unknown> | unknown;
    catch?: (reporter: Reporter, log: () => void) => unknown;
    finally?: (reporter: Reporter) => unknown;
    fatal?: (reporter: Reporter) => never;
  }): Promise<unknown> {
    try {
      options.setup?.(this);
      const result = await options.try(this);
      return result;
    } catch (e) {
      let result: unknown = undefined;

      if (options.catch) {
        result = options.catch(this, () => this.#catch(e));
      } else {
        this.#catch(e);
      }

      if (this.#options.failFast) {
        options.fatal?.(this);
      } else {
        return result;
      }
    } finally {
      const result = options.finally?.(this);

      if (result !== undefined) {
        return result;
      }
    }
  }

  #catch(e: unknown): void {
    console.log(chalk.red("An unexpected error occurred:"));

    if (e instanceof Error) {
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

  get multiline(): Reporter {
    return new Reporter(
      this.#workspace,
      this.#options,
      {
        ...this.#formatOptions,
        multiline: true,
      },
      this
    );
  }

  get indented(): Reporter {
    return new Reporter(
      this.#workspace,
      this.#options,
      {
        ...this.#formatOptions,
        indent: this.#formatOptions.indent + 2,
      },
      this
    );
  }

  get indentation(): number {
    return this.#formatOptions.indent;
  }

  indent(callback: (reporter: Reporter) => void): void {
    const reporter = this.indented;
    callback(reporter);
  }

  /**
   * Process a block of code that may contain logs and may throw exceptions. This is like `group`
   * but without a header.
   */
  get handle(): IGroup {
    return Reporter.Group.create(this);
  }

  /**
   * A group of log messages that are indented and separated by a blank line. If there are no
   * messages in the group, nothing is logged.
   */
  group<T>(
    message: string,
    callback: (reporter: Reporter) => Promise<T> | T
  ): Promise<T>;
  group(message: string): IGroup;
  group(
    message?: string,
    callback?: (reporter: Reporter) => Promise<unknown> | unknown
  ): Promise<unknown> | IGroup {
    const group = Reporter.Group.create(this, message);

    if (callback === undefined) {
      return group;
    } else {
      return group.normal(() => callback(this));
    }
  }

  /**
   * Flush is called automatically when anything is logged through the reporter. It may also be
   * called manually if you're calling a function that logs directly to the console.
   *
   * `flush` returns `true` if anything was logged, and `false` otherwise.
   */
  flush(): boolean {
    return this.#logger.flush(this.#formatOptions);
  }

  #format(message: string): string {
    return this.#logger.format(message, this.#formatOptions);
  }

  get isVerbose(): boolean {
    return this.#options.verbose;
  }

  verbose(
    log: (reporter: Reporter) => void,
    options?: { also: unknown }
  ): void {
    if (this.#options.verbose || options?.also) {
      log(this);
    }
  }

  #log(logger: (...args: unknown[]) => void, message: string): void {
    if (this.#formatOptions.multiline) {
      throw Error(`Multiline messages are not yet implemented`);
    }

    this.flush();

    logger(this.#format(message));
  }

  section(
    callback: (reporter: Reporter) => void,
    options: { break: "before" | "after" | "both" } = { break: "both" }
  ): void {
    const breakBefore = this.#didPrint && options.break !== "after";

    const reporter = new Reporter(
      this.#workspace,
      this.#options,
      {
        ...this.#formatOptions,
        breakBefore,
      },
      this
    );

    callback(reporter);

    if (reporter.#didPrint && options.break !== "before") {
      console.log("");
    }

    this.#didPrint &&= reporter.#didPrint;
  }

  log(message: string): void {
    this.#log(console.log, message);
  }

  error(message: string): void {
    this.#log(console.error, message);
  }

  fatal(message: string): never {
    this.error(`${chalk.redBright.inverse("FATAL")} ${chalk.red(message)}`);
    process.exit(1);
  }

  info(message: string): void {
    this.#log(console.info, message);
  }

  warn(message: string): void {
    this.#log(console.warn, message);
  }

  debug(message: string): void {
    this.#log(console.debug, message);
  }

  success(message: string): void {
    this.#log(console.log, chalk.greenBright(message));
  }

  static Group = class Group<Catch, Finally> implements IGroup<Catch, Finally> {
    static create(reporter: Reporter, message?: string): Group<void, void> {
      return new Group(reporter, message, {
        verbose: false,
        catch: (_, log) => log(),
        fatal: () => {
          /* Do nothing */
        },
        finally: () => {
          /* Do nothing */
        },
      });
    }

    readonly #reporter: Reporter;
    readonly #message: string | undefined;
    #verbose: "header:verbose" | "header:stylish" | boolean;
    #empty: string | undefined;
    #nested: boolean;
    #catchHandler: (reporter: Reporter, log: () => void) => unknown;
    #fatalHandler: (reporter: Reporter) => void;
    #finallyHandler: (reporter: Reporter) => unknown;

    constructor(
      reporter: Reporter,
      message: string | undefined,
      handlers: {
        verbose: "header:verbose" | "header:stylish" | boolean;
        empty?: string;
        nested?: boolean;
        catch: (reporter: Reporter, log: () => void) => Catch;
        fatal: (reporter: Reporter) => void;
        finally: (reporter: Reporter) => Finally;
      }
    ) {
      this.#reporter = reporter;
      this.#message = message;
      this.#verbose = handlers.verbose;
      this.#empty = handlers.empty;
      this.#nested = handlers.nested ?? true;
      this.#catchHandler = handlers.catch;
      this.#fatalHandler = handlers.fatal;
      this.#finallyHandler = handlers.finally;
    }

    stylish(_options: "header"): IGroup<Catch, Finally> {
      this.#verbose = "header:stylish";
      return this;
    }

    verbose(options: "header"): IGroup<Catch, Finally>;
    verbose(): IGroup<void | Catch, void | Finally>;
    verbose(options?: "header"): IGroup<unknown, unknown> {
      if (options === "header") {
        this.#verbose = "header:verbose";
      } else {
        this.#verbose = true;
      }

      return this;
    }

    try<HandleTry>(
      callback: (reporter: Reporter) => HandleTry | Promise<HandleTry>
    ): Promise<HandleTry | Catch | Finally>;
    try<HandleTry>(
      callback: (reporter: Reporter) => HandleTry | Promise<HandleTry>
    ): Promise<HandleTry | Catch | Finally | void>;
    async try<HandleTry>(
      callback: (reporter: Reporter) => HandleTry | Promise<HandleTry>
    ): Promise<HandleTry | Catch | Finally | void> {
      const normal = () => {
        return this.normal(async () => callback(this.#reporter));
      };

      const body = () => {
        return this.#handle(async () => callback(this.#reporter));
      };

      // Otherwise, it depends on the group's verbosity setting.
      switch (this.#verbose) {
        case "header:stylish":
          // log a stylish header only if the reporter is in stylish mode
          if (this.#reporter.#options.stylish) {
            return normal();
          } else {
            return body();
          }

        case "header:verbose":
          // log a verbose header only if the reporter is in verbose mode
          if (this.#reporter.#options.verbose) {
            return normal();
          } else {
            return body();
          }

        case true:
          // if the entire group is verbose, only log it if the reporter is in verbose mode
          if (this.#reporter.#options.verbose) {
            return normal();
          } else {
            return;
          }

        // If the group is not verbose, log everything
        case false:
          return normal();
      }
    }

    #handle<T>(
      callback: (reporter: Reporter) => Promise<T>
    ): Promise<T | Catch> {
      return this.#reporter.fallible({
        try: callback,
        catch: (r, log): Catch => {
          const result = this.#catchHandler(r, log) as Catch;
          log();
          return result;
        },
        fatal: () => process.exit(1),
      });
    }

    catch<HandleCatch>(
      callback: (reporter: Reporter, log: () => void) => HandleCatch
    ): IGroup<HandleCatch, Finally extends void ? HandleCatch : Finally> {
      this.#catchHandler = callback;
      return this as unknown as IGroup<HandleCatch, Finally>;
    }

    finally<HandleFinally>(
      callback: (reporter: Reporter) => HandleFinally
    ): IGroup<Catch, HandleFinally> {
      this.#finallyHandler = callback;
      return this as unknown as IGroup<Catch, HandleFinally>;
    }

    fatal(callback: (reporter: Reporter) => void): IGroup<Catch, Finally> {
      this.#fatalHandler = callback;
      return this as unknown as IGroup<Catch, Finally>;
    }

    get #header(): Header {
      if (this.#message === undefined) {
        return {
          type: "none",
        };
      } else if (this.#empty !== undefined) {
        return {
          type: "always",
          header: this.#message,
          empty: this.#empty,
          nested: this.#nested,
        };
      } else {
        return {
          type: "if:contents",
          header: this.#message,
          nested: this.#nested,
        };
      }
    }

    allowEmpty(): IGroup<Catch, Finally> {
      this.#empty = "";
      return this;
    }

    empty(value: string): IGroup<Catch, Finally> {
      this.#empty = value;
      return this;
    }

    flat(): IGroup<Catch, Finally> {
      this.#nested = false;
      return this;
    }

    async normal<T>(
      callback: (reporter: Reporter) => Promise<T> | T
    ): Promise<T | Catch | Finally> {
      const reporter = this.#reporter;

      return this.#reporter.fallible({
        setup: () => reporter.#logger.begin(this.#header),
        try: () => callback(this.#reporter) as T | Catch | Finally,
        catch: (_, log) => {
          return this.#catchHandler(this.#reporter, () => {
            log();
          }) as unknown as Catch;
        },
        fatal: () => {
          this.#fatalHandler(reporter);
          process.exit(1);
        },
        finally: () => {
          const result = this.#finallyHandler(reporter);
          reporter.#logger.end(this.#reporter.#formatOptions);

          if (result !== undefined) {
            return result;
          }
        },
      }) as T | Catch | Finally;
    }
  };
}

export interface IGroup<Catch = void, Finally = void> {
  catch<HandleCatch>(
    callback: (reporter: Reporter, log: () => void) => HandleCatch
  ): IGroup<HandleCatch, Finally extends void ? HandleCatch : Finally>;
  finally<HandleFinally>(
    callback: (reporter: Reporter) => HandleFinally
  ): IGroup<Catch, HandleFinally extends void ? Catch : HandleFinally>;
  fatal(callback: (reporter: Reporter) => void): IGroup<Catch, Finally>;

  verbose(options: "header"): IGroup<Catch, Finally>;
  verbose(): IGroup<Catch | void, Finally | void>;

  stylish(options: "header"): IGroup<Catch, Finally>;

  allowEmpty(): IGroup<Catch, Finally>;
  empty(value: string): IGroup<Catch, Finally>;
  flat(): IGroup<Catch, Finally>;

  /**
   * Only logs the header if the reporter is in verbose mode.
   */
  try<HandleTry>(
    callback: (reporter: Reporter) => HandleTry | Promise<HandleTry>
  ): Promise<HandleTry | Catch | Finally>;
}
