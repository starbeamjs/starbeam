import chalk from "chalk";
import { inspect } from "node:util";
import { CheckResults, type GroupedCheckResults } from "../checks.js";
import {
  FragmentImpl,
  Fragment,
  type IntoFallibleFragment,
  Style,
  LogResult,
} from "../log.js";
import type { IntoPresentArray } from "../type-magic.js";
import type { Workspace } from "../workspace.js";
import {
  format,
  Logger,
  type FormatOptions,
  type LoggerName,
} from "./logger.js";
import { STYLES } from "./styles.js";
import { Cell, LoggedTable, type TableWithRows } from "./table.js";

export interface ReporterOptions extends Record<string, unknown> {
  readonly verbose: boolean;
  readonly stylish: boolean;
  readonly density: "comfortable" | "compact";
  readonly failFast: boolean;
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
      null
    );
  }

  readonly #workspace: Workspace;
  readonly #options: ReporterOptions;
  readonly #formatOptions: FormatOptions;
  readonly #parent: Reporter | null;
  readonly #logger: Logger;

  private constructor(
    workspace: Workspace,
    options: ReporterOptions,
    format: FormatOptions,
    parent: null
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
    parent: Reporter | null
  ) {
    this.#workspace = workspace;
    this.#options = options;
    this.#formatOptions = format;
    this.#parent = parent;

    if (parent) {
      this.#logger = parent.#logger;
    } else {
      this.#logger = Logger.create(options);
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

  get leading(): number {
    return this.#logger.leading;
  }

  get indentation(): number {
    return this.#formatOptions.indent;
  }

  get didPrint(): boolean {
    return this.#logger.didPrint;
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
  group(message?: IntoFallibleFragment): IGroup {
    if (message === undefined) {
      return Reporter.Group.create(this);
    } else {
      return Reporter.Group.create(this, Fragment.fallibleFrom(message));
    }
  }

  ensureBlankLine(): void {
    this.#logger.ensureBlankLine();
  }

  /**
   * Flush is called automatically when anything is logged through the reporter.
   *
   * When something is logged manually to the console (e.g. `console.log`) you should call `.flush({
   * whenEmpty: "open" })`, which will flush the group header and leave the group open.
   *
   * Otherwise, you should call `.flush({ whenEmpty: "log" })`, which will log the current header
   * with `console.log` and close the group.
   */
  ensureOpen(): void {
    this.#logger.ensureOpen({ expect: "group" });
  }

  printEmpty(): void {
    this.#logger.printEmpty();
  }

  ifPrinted(callback: (reporter: Reporter) => void): void {
    if (this.#logger.didPrint) {
      callback(this);
    }
  }

  get isVerbose(): boolean {
    return this.#options.verbose;
  }

  get isStylish(): boolean {
    return this.#options.stylish;
  }

  verbose(
    log: (reporter: Reporter) => void,
    options?: { also: unknown }
  ): void {
    if (this.#options.verbose || options?.also) {
      log(this);
    }
  }

  #log(logger: LoggerName, message: IntoFallibleFragment): void {
    if (this.#formatOptions.multiline) {
      throw Error(`Multiline messages are not yet implemented`);
    }

    this.#logResult(`logging using ${logger}`, message, (message) => {
      this.#logger.line(
        logger,
        format({ message, options: this.#formatOptions })
      );
    });
  }

  #logResult(
    context: string,
    message: IntoFallibleFragment,
    fn: (message: string) => void
  ): void {
    const fragment = FragmentImpl.fallibleFrom(message);

    fragment
      .map((fragment) => fragment.stringify(this.#options))
      .mapErr((fragment) =>
        this.#logger.reportError(
          FragmentImpl.fallibleFrom(fragment)
            .getValue()
            .stringify(this.#options)
        )
      )
      .map((message) => fn(message));
  }

  ul({
    header,
    items,
    style,
    marker,
    item,
  }: {
    header?: IntoFallibleFragment;
    items: IntoPresentArray<IntoFallibleFragment>;
    style?: Style;
    marker?: Style | "none";
    item?: Style;
  }): void {
    const defaultStyle = style ?? Style.default;
    let markerStyle: Style | "none" = defaultStyle;

    if (marker) {
      markerStyle = marker;
    } else if (item) {
      markerStyle = item;
    }

    if (header) {
      const fragment = FragmentImpl.fallibleFrom(header).map((f) =>
        f.update(() => STYLES.header)
      );

      this.group(fragment).try(() => {
        for (const item of items) {
          this.#li(item, markerStyle);
        }
      });
    } else {
      for (const item of items) {
        this.#li(item, markerStyle);
      }
    }
  }

  #li(item: IntoFallibleFragment, markerStyle: Style | "none"): void {
    if (markerStyle === "none") {
      this.#log("log", item);
    } else {
      this.#log("log", `${Fragment.decoration(markerStyle, "•")} ${item}`);
    }
  }

  li(
    item: string,
    style: Style | { li: Style; marker?: Style } = Style.default
  ): void {
    if (Style.is(style)) {
      this.#li(Fragment(style, item), style);
    } else {
      this.#li(Fragment(style.li, item), style.marker ?? style.li);
    }
  }

  /**
   * If the current group has already printing, log the message on a new line. Otherwise,
   * concatenate the message onto the group's header and log it on the same line.
   */
  logCompact(fragment: IntoFallibleFragment): void {
    this.#logResult("logCompact", fragment, (message) =>
      this.#logger.concat("log", message)
    );
    this.#logger.printEmpty();
  }

  table(
    builder: (
      table: LoggedTable<IntoFallibleFragment>
    ) => TableWithRows<IntoFallibleFragment>
  ): void {
    const table = new LoggedTable<IntoFallibleFragment>({
      header: (h) => FragmentImpl.fallibleFrom(h),
      cell: (c) => FragmentImpl.fallibleFrom(c),
    });

    this.log(builder(table).stringify(this.#options));
  }

  async raw(
    callback: (options: {
      write: (message: string) => void;
      writeln: (message: string) => void;
    }) => void
  ): Promise<void> {
    return this.#logger.raw(callback);
  }

  log(fragment: IntoFallibleFragment): void {
    this.#log("log", fragment);
  }

  error(fragment: IntoFallibleFragment): void {
    this.#log("error", fragment);
  }

  async fatal(fragment: IntoFallibleFragment): Promise<never> {
    const message = FragmentImpl.fallibleFrom(fragment).map((f) => f);
    this.#logger.line(
      "error",
      `${chalk.redBright.inverse("FATAL")} ${chalk.red(message)}`
    );

    throw await this.#logger.exit(1);
  }

  info(message: string): void {
    this.#log("info", message);
  }

  warn(message: string): void {
    this.#log("warn", message);
  }

  debug(message: string): void {
    this.#log("debug", message);
  }

  success(message: string): void {
    this.#log("log", chalk.greenBright(message));
  }

  reportCheckResults(results: CheckResults | GroupedCheckResults): void {
    if (CheckResults.is(results)) {
      reportCheckResults(this, results);
    } else if (this.isVerbose) {
      return this.table((t) =>
        t
          .rows(
            [...results].flatMap(([name, groupResults]) => [
              [this.statusIcon(groupResults.isOk), Cell.spanned(name, 2)],
              ...[...groupResults].map(([name, checkResults]) => [
                "",
                this.statusIcon(checkResults.isOk),
                name,
              ]),
            ])
          )
          .options((o) => o.add({ colWidths: [4, 4] }))
      );
    } else {
      this.table((t) =>
        t.rows(
          [...results].map(([name, results]) => [
            this.statusIcon(results.isOk),
            name,
          ])
        )
      );
    }
  }

  statusIcon(isOk: boolean): string {
    return isOk ? "✔️" : "❌";
  }

  static Group = class Group<Catch> implements IGroup<Catch> {
    static create(
      reporter: Reporter,
      message?: LogResult<Fragment>
    ): Group<void> {
      return new Group(reporter, message, {
        verbose: "none:verbose",
        catch: (_, log) => log(),
        fatal: () => {
          process.exit(1);
        },
        finally: () => {
          /* Do nothing */
        },
        empty: () => {
          /* Do nothing */
        },
      });
    }

    readonly #reporter: Reporter;
    readonly #header: LogResult<Fragment> | undefined;
    #messageVerbosity: MessageVerbosity;
    #catchHandler: (reporter: Reporter, log: () => void) => unknown;
    #fatalHandler: (reporter: Reporter) => never;
    #finallyHandler: (reporter: Reporter) => void;
    #emptyHandler: (reporter: Reporter) => void;

    constructor(
      reporter: Reporter,
      header: LogResult<Fragment> | undefined,
      handlers: {
        verbose: MessageVerbosity;
        nested?: boolean;
        catch: (reporter: Reporter, log: () => void) => Catch;
        fatal: (reporter: Reporter) => never;
        finally: (reporter: Reporter) => void;
        empty: (reporter: Reporter) => void;
      }
    ) {
      this.#reporter = reporter;
      this.#header = header;
      this.#messageVerbosity = handlers.verbose;
      this.#emptyHandler = handlers.empty;
      this.#catchHandler = handlers.catch;
      this.#fatalHandler = handlers.fatal;
      this.#finallyHandler = handlers.finally;
    }

    stylish(_options: "header"): IGroup<Catch> {
      this.#messageVerbosity = "header:stylish";
      return this;
    }

    verbose(options: "header"): IGroup<Catch>;
    verbose(): IGroup<void | Catch>;
    verbose(options?: "header"): IGroup<unknown> {
      if (options === "header") {
        this.#messageVerbosity = "header:verbose";
      } else {
        this.#messageVerbosity = "all:verbose";
      }

      return this;
    }

    try<HandleTry>(
      callback: (reporter: Reporter) => HandleTry
    ): HandleTry | Catch {
      return this.#run(callback);
    }

    tryAsync<HandleTry>(
      callback: (reporter: Reporter) => HandleTry | Promise<HandleTry>
    ): Promise<Catch | HandleTry> {
      return this.#runAsync(callback);
    }

    get #shouldLogBody(): boolean {
      switch (this.#messageVerbosity) {
        case "header:verbose":
        case "header:stylish":
        case "none:verbose":
          return true;

        case "all:verbose":
          return false;
      }
    }

    catch<HandleCatch>(
      callback: (reporter: Reporter, log: () => void) => HandleCatch
    ): IGroup<HandleCatch> {
      this.#catchHandler = callback;
      return this as unknown as IGroup<HandleCatch>;
    }

    finally(callback: (reporter: Reporter) => void): IGroup<Catch> {
      this.#finallyHandler = callback;
      return this as IGroup<Catch>;
    }

    fatal(callback: (reporter: Reporter) => never): IGroup<Catch> {
      this.#fatalHandler = callback;
      return this as unknown as IGroup<Catch>;
    }

    allowEmpty(): IGroup<Catch> {
      this.#emptyHandler = (r) => r.#logger.printEmpty();
      return this;
    }

    empty(value: string | ((reporter: Reporter) => void)): IGroup<Catch> {
      if (typeof value === "string") {
        this.#emptyHandler = (r) => r.log(value);
      } else {
        this.#emptyHandler = value;
      }
      return this;
    }

    #begin() {
      const header = this.#header?.get();

      switch (header?.status) {
        case undefined:
        case "ok":
          this.#reporter.#logger.begin(
            header?.value,
            this.#reporter.#formatOptions
          );
          break;
        case "err":
          this.#reporter.#logger.reportError(header.reason);
      }
      // const string = this.#header.map((header) => header.message.
    }

    #end() {
      this.#reporter.#logger.end();
    }

    #run<T>(callback: (reporter: Reporter) => T): T | Catch {
      const reporter = this.#reporter;

      if (!this.#shouldLogBody) {
        this.#finallyHandler(reporter);
        return undefined as Catch;
      }

      this.#begin();

      try {
        const result = callback(reporter);

        if (reporter.#logger.didPrint) {
          this.#finallyHandler(reporter);
        } else {
          this.#emptyHandler(reporter);
        }
        this.#end();
        return result;
      } catch (e: Error | unknown) {
        const result = this.#catchHandler(reporter, () => {
          if (e instanceof Error) {
            reporter.#logger.reportError(e);
          } else {
            reporter.#logger.reportError(Fragment.comment(inspect(e)));
          }
        });

        if (this.#reporter.#options.failFast) {
          throw this.#fatalHandler(reporter);
        } else {
          if (this.#reporter.didPrint) {
            this.#finallyHandler(reporter);
          } else {
            this.#emptyHandler(reporter);
          }
          this.#end();
          return result as Catch;
        }
      }
    }

    async #runAsync<T>(
      callback: (reporter: Reporter) => T | Promise<T>
    ): Promise<T | Catch> {
      const reporter = this.#reporter;

      if (!this.#shouldLogBody) {
        this.#finallyHandler(reporter);
        return undefined as Catch;
      }

      this.#begin();

      try {
        const result = await callback(reporter);

        if (reporter.#logger.didPrint) {
          this.#finallyHandler(reporter);
        } else {
          this.#emptyHandler(reporter);
        }
        this.#end();
        return result;
      } catch (e: Error | unknown) {
        const result = this.#catchHandler(reporter, () => {
          if (e instanceof Error) {
            reporter.#logger.reportError(e);
          } else {
            reporter.#logger.reportError(Fragment.comment(inspect(e)));
          }
        });

        if (this.#reporter.#options.failFast) {
          throw this.#fatalHandler(reporter);
        } else {
          if (this.#reporter.didPrint) {
            this.#finallyHandler(reporter);
          } else {
            this.#emptyHandler(reporter);
          }
          this.#end();
          return result as Catch;
        }
      }
    }
  };
}

export interface IGroup<Catch = void> {
  catch<HandleCatch>(
    callback: (reporter: Reporter, log: () => void) => HandleCatch
  ): IGroup<HandleCatch>;

  finally(callback: (reporter: Reporter) => void): IGroup<Catch>;
  fatal(callback: (reporter: Reporter) => void): IGroup<Catch>;

  verbose(options: "header"): IGroup<Catch>;
  verbose(): IGroup<Catch | void>;

  stylish(options: "header"): IGroup<Catch>;

  allowEmpty(): IGroup<Catch>;

  empty(value: string | ((reporter: Reporter) => void)): IGroup<Catch>;

  /**
   * Only logs the header if the reporter is in verbose mode.
   */

  try<HandleTry>(
    callback: (reporter: Reporter) => HandleTry
  ): HandleTry | Catch;

  tryAsync<HandleTry>(
    callback: (reporter: Reporter) => HandleTry | Promise<HandleTry>
  ): Promise<HandleTry | Catch>;
}

type MessageVerbosity =
  | "header:verbose"
  | "header:stylish"
  | "all:verbose"
  | "none:verbose";

export function reportCheckResults(
  reporter: Reporter,
  results: CheckResults
): void {
  if (results.isOk && !reporter.isVerbose) {
    reporter.success("✔️ all checks passed");
    return;
  }

  const printedResults = reporter.isVerbose
    ? [...results]
    : [...results.errors];

  reporter.ensureBlankLine();

  reporter.table((t) => {
    const table = t.headers(["", Fragment("comment:header", "check")]);

    return table.rows(
      printedResults.map(([label, result]) => {
        if (result.isOk) {
          return [Fragment("ok", "✔️"), Fragment("ok", label)];
        } else {
          return [Fragment("problem", "❌"), Fragment("problem", label)];
        }
      })
    );
  });
}
