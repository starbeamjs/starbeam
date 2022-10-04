import chalk from "chalk";
import { Style, type StyleRecord } from "../log.js";
import type { IntoPresentArray } from "../type-magic.js";
import type { Workspace } from "../workspace.js";
import {
  format,
  Logger,
  type FormatOptions,
  type Header,
  type LoggerName,
} from "./logger.js";
import type { AnyStyleName } from "./styles.js";

export interface ReporterOptions {
  readonly verbose: boolean;
  readonly stylish: boolean;
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
      this.#logger = Logger.create();
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
  group(
    message?: string | StyleRecord,
    { style }: { style: Style } = { style: Style.default }
  ): IGroup {
    if (message === undefined) {
      return Reporter.Group.create(this);
    } else if (typeof message === "string") {
      return Reporter.Group.create(
        this,
        message ? Style.header(style, message) : undefined
      );
    } else {
      return Reporter.Group.create(this, Style(message));
    }
  }

  /**
   * Flush is called automatically when anything is logged through the reporter. It may also be
   * called manually if you're calling a function that logs directly to the console.
   */
  flush(): void {
    return this.#logger.flush();
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

  #log(logger: LoggerName, message: string): void {
    if (this.#formatOptions.multiline) {
      throw Error(`Multiline messages are not yet implemented`);
    }

    this.#logger.line(
      logger,
      format({ message, options: this.#formatOptions })
    );
  }

  ul({
    header,
    items,
    style,
    marker,
    item,
  }: {
    header?: string;
    items: IntoPresentArray<string>;
    style?: Style;
    marker?: Style | "none";
    item?: Style;
  }): void {
    const defaultStyle = style ?? Style.default;
    const headerStyle = defaultStyle;
    const itemStyle = item ? item : defaultStyle;
    let markerStyle: Style | "none" = defaultStyle;

    if (marker) {
      markerStyle = marker;
    } else if (item) {
      markerStyle = item;
    }

    if (header) {
      this.#logger.logGroupStart(Style.header(headerStyle, header));
    }

    for (const item of items) {
      this.#li(Style(itemStyle, item), markerStyle);
    }

    if (header) {
      this.#logger.logGroupEnd();
    }
  }

  #li(item: string, markerStyle: Style | "none"): void {
    if (markerStyle === "none") {
      this.#log("log", item);
    } else {
      this.#log("log", `${Style.decoration(markerStyle, "•")} ${item}`);
    }
  }

  li(
    ...args:
      | [item: string, style?: Style | { li?: Style; marker: Style }]
      | [StyleRecord]
  ): void {
    if (args.length === 1) {
      const [record] = args;
      const [style, message] = Object.entries(record)[0] as [
        AnyStyleName,
        string
      ];
      this.#li(Style(style, message), style);
    } else {
      const [item, style = Style.default] = args;
      if (Style.is(style)) {
        this.#li(Style(style, item), style);
      } else {
        this.#li(Style(style.li, item), style.marker);
      }
    }
  }

  log(message: string, style?: Style): void;
  log(record: StyleRecord): void;
  log(message: string | StyleRecord, style: Style = Style.default): void {
    if (typeof message === "string") {
      this.#log("log", Style(style, message));
    } else {
      this.#log("log", Style(message));
    }
  }

  error(message: string): void {
    this.#log("error", message);
  }

  async fatal(message: string): Promise<never> {
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

  static Group = class Group<Catch, Finally> implements IGroup<Catch, Finally> {
    static create(reporter: Reporter, message?: string): Group<void, void> {
      return new Group(reporter, message, {
        verbose: "none:verbose",
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
    #messageVerbosity: MessageVerbosity;
    #empty: string | undefined;
    #nested: boolean;
    #catchHandler: (reporter: Reporter, log: () => void) => unknown;
    #fatalHandler: (reporter: Reporter) => void;
    #finallyHandler: (reporter: Reporter) => unknown;

    constructor(
      reporter: Reporter,
      message: string | undefined,
      handlers: {
        verbose: MessageVerbosity;
        empty?: string;
        nested?: boolean;
        catch: (reporter: Reporter, log: () => void) => Catch;
        fatal: (reporter: Reporter) => void;
        finally: (reporter: Reporter) => Finally;
      }
    ) {
      this.#reporter = reporter;
      this.#message = message;
      this.#messageVerbosity = handlers.verbose;
      this.#empty = handlers.empty;
      this.#nested = handlers.nested ?? true;
      this.#catchHandler = handlers.catch;
      this.#fatalHandler = handlers.fatal;
      this.#finallyHandler = handlers.finally;
    }

    stylish(_options: "header"): IGroup<Catch, Finally> {
      this.#messageVerbosity = "header:stylish";
      return this;
    }

    verbose(options: "header"): IGroup<Catch, Finally>;
    verbose(): IGroup<void | Catch, void | Finally>;
    verbose(options?: "header"): IGroup<unknown, unknown> {
      if (options === "header") {
        this.#messageVerbosity = "header:verbose";
      } else {
        this.#messageVerbosity = "all:verbose";
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
      return this.#run(callback);
    }

    get #shouldLogHeader(): boolean {
      switch (this.#messageVerbosity) {
        case "header:verbose":
        case "all:verbose":
          return this.#reporter.#options.verbose;

        case "header:stylish":
          return this.#reporter.#options.stylish;

        case "none:verbose":
          return true;
      }
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
          message: this.#message,
          empty: this.#empty,
          nested: this.#nested,
          options: this.#reporter.#formatOptions,
        };
      } else {
        return {
          type: "if:contents",
          message: this.#message,
          nested: this.#nested,
          options: this.#reporter.#formatOptions,
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

    #begin() {
      this.#reporter.#logger.begin(
        this.#shouldLogHeader ? this.#header : undefined
      );
    }

    #end() {
      this.#reporter.#logger.end();
    }

    async #run<T>(
      callback: (reporter: Reporter) => T
    ): Promise<T | Catch | Finally | void> {
      const reporter = this.#reporter;

      if (!this.#shouldLogBody) {
        this.#finallyHandler(reporter);
        return;
      }

      this.#begin();

      try {
        const result = await callback(reporter);
        this.#finallyHandler(reporter);
        this.#end();
        return result;
      } catch (e) {
        const result = await this.#catchHandler(reporter, () => {
          reporter.#logger.reportError(e);
        });

        if (this.#reporter.#options.failFast) {
          this.#fatalHandler(reporter);
          this.#end();
        } else {
          this.#finallyHandler(reporter);
          this.#end();
          return result as T | Catch;
        }
      }
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

  /**
   * Only logs the header if the reporter is in verbose mode.
   */
  try<HandleTry>(
    this: IGroup<Promise<any>, any>,
    callback: (reporter: Reporter) => Promise<HandleTry>
  ): Promise<HandleTry | Catch | Finally>;
  try<HandleTry>(
    callback: (reporter: Reporter) => HandleTry
  ): HandleTry | Catch | Finally;

  /**
   * Only logs the header if the reporter is in verbose mode.
   */
  try<HandleTry>(
    callback: (reporter: Reporter) => HandleTry | Promise<HandleTry>
  ): Promise<HandleTry | Catch | Finally>;
}

type MessageVerbosity =
  | "header:verbose"
  | "header:stylish"
  | "all:verbose"
  | "none:verbose";
