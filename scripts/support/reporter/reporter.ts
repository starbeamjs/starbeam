import { inspect } from "node:util";

import chalk from "chalk";

import { type GroupedCheckResults, CheckResults } from "../checks.js";
import {
  type IntoFallibleFragment,
  type IntoFragment,
  type IntoFragmentMap,
  Fragment,
  FragmentImpl,
  FragmentMap,
  isIntoFragment,
  LogResult,
  Style,
} from "../log.js";
import { type IntoPresentArray, PresentArray } from "../type-magic.js";
import type { Workspace } from "../workspace.js";
import { type LoggerName, type LoggerState, Logger } from "./logger.js";
import { STYLES } from "./styles.js";
import { type TableWithRows, Cell, LoggedTable } from "./table.js";

export interface ReporterOptions {
  readonly verbose: boolean;
  readonly stylish: boolean;
  readonly density: "comfortable" | "compact";
  readonly failFast: boolean;
}

export interface RawWriter {
  write: (message: string) => void;
  writeln: (message: string) => void;
}

export class Reporter {
  static root(workspace: Workspace, options: ReporterOptions): Reporter {
    return new Reporter(workspace, options, null);
  }

  readonly #workspace: Workspace;
  readonly #options: ReporterOptions;
  readonly #parent: Reporter | null;
  readonly #logger: Logger;

  private constructor(
    workspace: Workspace,
    options: ReporterOptions,
    parent: null
  );
  private constructor(
    workspace: Workspace,
    options: ReporterOptions,
    parent: Reporter
  );
  private constructor(
    workspace: Workspace,
    options: ReporterOptions,
    parent: Reporter | null
  ) {
    this.#workspace = workspace;
    this.#options = options;
    this.#parent = parent;

    if (parent) {
      this.#logger = parent.#logger;
    } else {
      this.#logger = Logger.create(options);
    }
  }

  get loggerState(): LoggerState {
    return this.#logger.state;
  }

  get nesting(): number {
    return this.#logger.leading;
  }

  get leading(): number {
    return this.#logger.leading * 2;
  }

  get didPrint(): boolean {
    return this.#logger.didPrint;
  }

  stringify(fragment: Fragment): string {
    return fragment.stringify(this.loggerState);
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

  ensureBreak(): void {
    this.#logger.ensureBreak();
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
    this.#logResult(`logging using ${logger}`, message, (message) => {
      this.#logger.logln(message, logger);
    });
  }

  #logResult(
    context: string,
    message: IntoFallibleFragment,
    fn: (message: string) => void
  ): void {
    const fragment = FragmentImpl.fallibleFrom(message);

    fragment
      .map((fragment) =>
        fragment.stringify(this.#workspace.reporter.loggerState)
      )
      .mapErr((fragment) =>
        this.#logger.reportError(FragmentImpl.fallibleFrom(fragment).getValue())
      )
      .map((message) => fn(message));
  }

  groupedTable({
    header,
    items,
  }: {
    header?: IntoFragment;
    items: IntoFragmentMap<IntoPresentArray<IntoPresentArray<IntoFragment>>>;
  }): void {
    this.table((t) => {
      return t.headers(header ? [Cell.spanned(header, 3)] : undefined).rows(
        FragmentMap.from(items, (value) =>
          PresentArray.from(value).map((nested) =>
            PresentArray.from(nested).map(Fragment.from)
          )
        ).flatMap((header, fragments) => {
          return [[Cell.spanned(header, 3)], fragments];
        })
      );
    });
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
  endWith(ending: Ending): void {
    function normalize<P extends "nested" | "compact">(
      partName: P
    ): LoggerEndWith[P] {
      if (isIntoFragment(ending)) {
        return { fragment: Fragment.from(ending) } as LoggerEndWith[P];
      } else {
        const part = ending[partName] as
          | undefined
          | IntoFragment
          | NestedEndWith
          | CompactEndWith;

        if (isIntoFragment(part)) {
          return {
            fragment: Fragment.from(part),
          } as LoggerEndWith[P];
        } else if (part) {
          return {
            ...part,
            fragment: Fragment.from(part.fragment),
          } as LoggerEndWith[P];
        }
      }
    }

    const compact = normalize("compact");
    const nested = normalize("nested");

    this.#logger.endWith("log", {
      compact,
      nested,
    });
  }

  table(
    builder: (table: LoggedTable<IntoFragment>) => TableWithRows<IntoFragment>
  ): void {
    const table = new LoggedTable<IntoFragment>({
      header: (h) => Fragment.from(h),
      cell: (c) => Fragment.from(c),
    });

    this.log(builder(table).stringify(this.loggerState));
  }

  async raw(callback: (writer: RawWriter) => void): Promise<void> {
    return this.#logger.raw(callback);
  }

  log(fragment: IntoFallibleFragment): void {
    this.#log("log", fragment);
  }

  error(fragment: IntoFallibleFragment): void {
    this.#log("error", fragment);
  }

  reportError(error: Error | IntoFragment): void {
    this.#logger.reportError(error);
  }

  fatal(fragment: IntoFallibleFragment): never {
    FragmentImpl.fallibleFrom(fragment)
      .map((f) => {
        this.#logger.logln(
          `${chalk.redBright.inverse("FATAL")} ${chalk.red(f)}`,
          "error"
        );
      })
      .mapErr((err) => {
        this.#logger.logln(
          `${chalk.redBright.inverse(
            "FATAL"
          )} Something went wrong when processing the fatal error message:\n\n${chalk.red(
            String(err)
          )}`,
          "error"
        );
      });

    this.#logger.exit(1);
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

  reportCheckResults(
    results: CheckResults,
    options: { success: string; header: string }
  ): void;
  reportCheckResults(
    results: GroupedCheckResults,
    options: { success: string }
  ): void;
  reportCheckResults(
    results: CheckResults | GroupedCheckResults,
    options: { success: string; header: string }
  ): void {
    if (CheckResults.is(results)) {
      reportCheckResults(this, results, options);
    } else if (this.isVerbose) {
      return this.table((t) =>
        t.rows(
          [...results].flatMap(([name, groupResults]) => {
            return [
              [this.statusIcon(groupResults.isOk), Cell.spanned(name, 2)],
              ...[...groupResults].map(([name, checkResults]) => [
                "",
                this.statusIcon(checkResults.isOk),
                name,
              ]),
            ];
          })
        )
      );
    } else if (results.isOk) {
      this.#workspace.reporter.ensureBreak();
      this.#workspace.reporter.success(`✔️ ${options.success}`);
    } else {
      this.table((t) =>
        t.rows(
          [...results.errors].map(([name, results]) => [
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
      return new Group(reporter, message ?? LogResult.ok(undefined), false, {
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
    readonly #header: LogResult<Fragment | undefined>;
    #breakBefore: boolean;
    #messageVerbosity: MessageVerbosity;
    #catchHandler: (reporter: Reporter, log: () => void) => unknown;
    #fatalHandler: (reporter: Reporter) => never;
    #finallyHandler: (reporter: Reporter) => void;
    #emptyHandler: (reporter: Reporter) => void;

    constructor(
      reporter: Reporter,
      header: LogResult<Fragment | undefined>,
      breakBefore: boolean,
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
      this.#breakBefore = breakBefore;
      this.#messageVerbosity = handlers.verbose;
      this.#emptyHandler = handlers.empty;
      this.#catchHandler = handlers.catch;
      this.#fatalHandler = handlers.fatal;
      this.#finallyHandler = handlers.finally;
    }

    breakBefore(shouldBreak = true): IGroup<Catch> {
      this.#breakBefore = shouldBreak;
      return this;
    }

    stylish(_options: "header"): IGroup<Catch> {
      this.#messageVerbosity = "header:stylish";
      return this;
    }

    verbose(options?: "header" | boolean): IGroup<unknown> {
      if (options === "header") {
        this.#messageVerbosity = "header:verbose";
      } else if (options === false) {
        this.#messageVerbosity = "none:verbose";
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
      return this.#header
        .map((value) => {
          this.#reporter.#logger.begin(value, {
            breakBefore: this.#breakBefore,
          });
        })
        .mapErr((reason) => {
          this.#reporter.#logger.reportError(reason);
        });
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
  /// STYLING OPTIONS ///
  stylish(options: "header"): IGroup<Catch>;

  verbose(options: "header" | false): IGroup<Catch>;
  verbose(options?: "header" | boolean): IGroup<Catch | void>;

  breakBefore(shouldBreak?: boolean): IGroup<Catch>;

  allowEmpty(): IGroup<Catch>;
  empty(value: string | ((reporter: Reporter) => void)): IGroup<Catch>;

  /// EXECUTION OPTIONS ///

  catch<HandleCatch>(
    callback: (reporter: Reporter, log: () => void) => HandleCatch
  ): IGroup<HandleCatch>;

  finally(callback: (reporter: Reporter) => void): IGroup<Catch>;
  fatal(callback: (reporter: Reporter) => void): IGroup<Catch>;

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
  results: CheckResults,
  options: {
    success: string;
    header: string;
  }
): void {
  if (results.isOk && !reporter.isVerbose) {
    reporter.success(`✔️ ${options.success}`);
    return;
  }

  const printedResults = reporter.isVerbose
    ? [...results]
    : [...results.errors];

  reporter.ensureBreak();

  reporter.table((t) => {
    const table = t.headers(["", Fragment("comment:header", options.header)]);

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

export type NestedEndWith = { fragment: IntoFragment; breakBefore?: boolean };

export type CompactEndWith = {
  fragment: IntoFragment;
  breakBefore?: boolean;
  replace?: boolean;
};

export type EndWith = {
  nested: IntoFragment | NestedEndWith;
  compact: IntoFragment | CompactEndWith;
};

export type LoggerEndWith = {
  nested?: { fragment: Fragment; breakBefore?: boolean };
  compact?: {
    fragment: Fragment;
    breakBefore?: boolean;
    replace: boolean;
  };
};

export type Ending =
  | IntoFragment
  | {
      nested?: IntoFragment | NestedEndWith;
      compact?: IntoFragment | CompactEndWith;
    };

export type ChangeType = "create" | "remove" | "update";
export type ChangeResult = ChangeType | false;
