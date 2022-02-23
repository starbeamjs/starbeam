import { assert } from "@starbeam/verify";
import { CONFIG } from "../fundamental/config.js";

export enum LogLevel {
  Trace = 0b0000001,
  Debug = 0b0000010,
  Info = 0b0000100,
  Warn = 0b0001000,
  Error = 0b0010000,
  Bug = 0b0100000,
  Silent = 0b1000000,
}

interface TraceConsole {
  Console: console.ConsoleConstructor;
  /**
   * `console.assert()` writes a message if `value` is [falsy](https://developer.mozilla.org/en-US/docs/Glossary/Falsy) or omitted. It only
   * writes a message and does not otherwise affect execution. The output always
   * starts with `"Assertion failed"`. If provided, `message` is formatted using `util.format()`.
   *
   * If `value` is [truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy), nothing happens.
   *
   * ```js
   * console.assert(true, 'does nothing');
   *
   * console.assert(false, 'Whoops %s work', 'didn\'t');
   * // Assertion failed: Whoops didn't work
   *
   * console.assert();
   * // Assertion failed
   * ```
   * @since v0.1.101
   * @param value The value tested for being truthy.
   * @param message All arguments besides `value` are used as error message.
   */
  assert(value: unknown, message?: string, ...optionalParams: unknown[]): void;
  /**
   * When `stdout` is a TTY, calling `console.clear()` will attempt to clear the
   * TTY. When `stdout` is not a TTY, this method does nothing.
   *
   * The specific operation of `console.clear()` can vary across operating systems
   * and terminal types. For most Linux operating systems, `console.clear()`operates similarly to the `clear` shell command. On Windows, `console.clear()`will clear only the output in the
   * current terminal viewport for the Node.js
   * binary.
   * @since v8.3.0
   */
  clear(): void;
  /**
   * Maintains an internal counter specific to `label` and outputs to `stdout` the
   * number of times `console.count()` has been called with the given `label`.
   *
   * ```js
   * > console.count()
   * default: 1
   * undefined
   * > console.count('default')
   * default: 2
   * undefined
   * > console.count('abc')
   * abc: 1
   * undefined
   * > console.count('xyz')
   * xyz: 1
   * undefined
   * > console.count('abc')
   * abc: 2
   * undefined
   * > console.count()
   * default: 3
   * undefined
   * >
   * ```
   * @since v8.3.0
   * @param label The display label for the counter.
   */
  count(label?: string): void;
  /**
   * Resets the internal counter specific to `label`.
   *
   * ```js
   * > console.count('abc');
   * abc: 1
   * undefined
   * > console.countReset('abc');
   * undefined
   * > console.count('abc');
   * abc: 1
   * undefined
   * >
   * ```
   * @since v8.3.0
   * @param label The display label for the counter.
   */
  countReset(label?: string): void;
  /**
   * The `console.debug()` function is an alias for {@link log}.
   * @since v8.0.0
   */
  debug(message?: unknown, ...optionalParams: unknown[]): void;
  /**
   * Uses `util.inspect()` on `obj` and prints the resulting string to `stdout`.
   * This function bypasses any custom `inspect()` function defined on `obj`.
   * @since v0.1.101
   */
  dir(obj: unknown, options?: InspectOptions): void;
  /**
   * This method calls `console.log()` passing it the arguments received.
   * This method does not produce any XML formatting.
   * @since v8.0.0
   */
  dirxml(...data: any[]): void;
  /**
   * Prints to `stderr` with newline. Multiple arguments can be passed, with the
   * first used as the primary message and all additional used as substitution
   * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
   *
   * ```js
   * const code = 5;
   * console.error('error #%d', code);
   * // Prints: error #5, to stderr
   * console.error('error', code);
   * // Prints: error 5, to stderr
   * ```
   *
   * If formatting elements (e.g. `%d`) are not found in the first string then `util.inspect()` is called on each argument and the resulting string
   * values are concatenated. See `util.format()` for more information.
   * @since v0.1.100
   */
  error(message?: unknown, ...optionalParams: any[]): void;
  /**
   * Increases indentation of subsequent lines by spaces for `groupIndentation`length.
   *
   * If one or more `label`s are provided, those are printed first without the
   * additional indentation.
   * @since v8.5.0
   */
  group(...label: unknown[]): void;
  /**
   * An alias for {@link group}.
   * @since v8.5.0
   */
  groupCollapsed(...label: any[]): void;
  /**
   * Decreases indentation of subsequent lines by spaces for `groupIndentation`length.
   * @since v8.5.0
   */
  groupEnd(): void;
  /**
   * The `console.info()` function is an alias for {@link log}.
   * @since v0.1.100
   */
  info(message?: unknown, ...optionalParams: unknown[]): void;
  /**
   * Prints to `stdout` with newline. Multiple arguments can be passed, with the
   * first used as the primary message and all additional used as substitution
   * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
   *
   * ```js
   * const count = 5;
   * console.log('count: %d', count);
   * // Prints: count: 5, to stdout
   * console.log('count:', count);
   * // Prints: count: 5, to stdout
   * ```
   *
   * See `util.format()` for more information.
   * @since v0.1.100
   */
  log(message?: unknown, ...optionalParams: unknown[]): void;
  /**
   * Try to construct a table with the columns of the properties of `tabularData`(or use `properties`) and rows of `tabularData` and log it. Falls back to just
   * logging the argument if it can’t be parsed as tabular.
   *
   * ```js
   * // These can't be parsed as tabular data
   * console.table(Symbol());
   * // Symbol()
   *
   * console.table(undefined);
   * // undefined
   *
   * console.table([{ a: 1, b: 'Y' }, { a: 'Z', b: 2 }]);
   * // ┌─────────┬─────┬─────┐
   * // │ (index) │  a  │  b  │
   * // ├─────────┼─────┼─────┤
   * // │    0    │  1  │ 'Y' │
   * // │    1    │ 'Z' │  2  │
   * // └─────────┴─────┴─────┘
   *
   * console.table([{ a: 1, b: 'Y' }, { a: 'Z', b: 2 }], ['a']);
   * // ┌─────────┬─────┐
   * // │ (index) │  a  │
   * // ├─────────┼─────┤
   * // │    0    │  1  │
   * // │    1    │ 'Z' │
   * // └─────────┴─────┘
   * ```
   * @since v10.0.0
   * @param properties Alternate properties for constructing the table.
   */
  // TODO: Correctly type
  table(tabularData: unknown, properties?: ReadonlyArray<string>): void;
  /**
   * Starts a timer that can be used to compute the duration of an operation. Timers
   * are identified by a unique `label`. Use the same `label` when calling {@link timeEnd} to stop the timer and output the elapsed time in
   * suitable time units to `stdout`. For example, if the elapsed
   * time is 3869ms, `console.timeEnd()` displays "3.869s".
   * @since v0.1.104
   */
  time(label?: string): void;
  /**
   * Stops a timer that was previously started by calling {@link time} and
   * prints the result to `stdout`:
   *
   * ```js
   * console.time('100-elements');
   * for (let i = 0; i < 100; i++) {}
   * console.timeEnd('100-elements');
   * // prints 100-elements: 225.438ms
   * ```
   * @since v0.1.104
   */
  timeEnd(label?: string): void;
  /**
   * For a timer that was previously started by calling {@link time}, prints
   * the elapsed time and other `data` arguments to `stdout`:
   *
   * ```js
   * console.time('process');
   * const value = expensiveProcess1(); // Returns 42
   * console.timeLog('process', value);
   * // Prints "process: 365.227ms 42".
   * doExpensiveProcess2(value);
   * console.timeEnd('process');
   * ```
   * @since v10.7.0
   */
  timeLog(label?: string, ...data: any[]): void;
  /**
   * Prints to `stderr` the string `'Trace: '`, followed by the `util.format()` formatted message and stack trace to the current position in the code.
   *
   * ```js
   * console.trace('Show me');
   * // Prints: (stack trace will vary based on where trace is called)
   * //  Trace: Show me
   * //    at repl:2:9
   * //    at REPLServer.defaultEval (repl.js:248:27)
   * //    at bound (domain.js:287:14)
   * //    at REPLServer.runBound [as eval] (domain.js:300:12)
   * //    at REPLServer.<anonymous> (repl.js:412:12)
   * //    at emitOne (events.js:82:20)
   * //    at REPLServer.emit (events.js:169:7)
   * //    at REPLServer.Interface._onLine (readline.js:210:10)
   * //    at REPLServer.Interface._line (readline.js:549:8)
   * //    at REPLServer.Interface._ttyWrite (readline.js:826:14)
   * ```
   * @since v0.1.104
   */
  trace(message?: unknown, ...optionalParams: unknown[]): void;
  /**
   * The `console.warn()` function is an alias for {@link error}.
   * @since v0.1.100
   */
  warn(message?: unknown, ...optionalParams: any[]): void;
  // --- Inspector mode only ---
  /**
   * This method does not display anything unless used in the inspector.
   *  Starts a JavaScript CPU profile with an optional label.
   */
  profile(label?: string): void;
  /**
   * This method does not display anything unless used in the inspector.
   *  Stops the current JavaScript CPU profiling session if one has been started and prints the report to the Profiles panel of the inspector.
   */
  profileEnd(label?: string): void;
  /**
   * This method does not display anything unless used in the inspector.
   *  Adds an event with the label `label` to the Timeline panel of the inspector.
   */
  timeStamp(label?: string): void;
}

export class Group {
  static start(
    console: TraceConsole,
    label: string,
    shouldLog: boolean
  ): Group {
    return new Group(console, label, shouldLog, false);
  }

  readonly #console: TraceConsole;
  readonly #label: string;
  readonly #shouldLog: boolean;
  #started: boolean;

  private constructor(
    console: TraceConsole,
    label: string,
    shouldLog: boolean,
    started: boolean
  ) {
    this.#console = console;
    this.#label = label;
    this.#shouldLog = shouldLog;
    this.#started = started;
  }

  collapsed(): Group;
  collapsed<T>(callback: () => T): T;
  collapsed(callback?: () => unknown): unknown {
    this.#started = true;

    if (!this.#shouldLog) {
      if (callback) {
        return callback();
      } else {
        return this;
      }
    }

    this.#console.groupCollapsed(this.#label);

    if (callback) {
      try {
        return callback();
      } finally {
        this.#console.groupEnd();
      }
    } else {
      return this;
    }
  }

  expanded(): Group {
    this.#started = true;

    if (this.#shouldLog) {
      this.#console.group(this.#label);
    }

    return this;
  }

  end(): void {
    assert(
      this.#started,
      `You must call group.expanded() or group.collapsed() before group.end()`
    );

    if (this.#shouldLog) {
      this.#console.groupEnd();
    }
  }
}

interface TraceModifiers {
  readonly withStack: TraceMethods;
}

interface TraceMethods extends TraceModifiers {
  log(format: string, ...args: unknown[]): void;
  log(...args: unknown[]): void;

  log(format: string, ...args: unknown[]): void;
  log(...args: unknown[]): void;

  group(description: string): Group;
  group<T>(description: string, callback: () => T): T;
}

interface TraceLevels {
  readonly trace: TraceMethods;
  readonly warn: TraceMethods;
}

export interface InspectOptions {
  /**
   * If set to `true`, getters are going to be
   * inspected as well. If set to `'get'` only getters without setter are going
   * to be inspected. If set to `'set'` only getters having a corresponding
   * setter are going to be inspected. This might cause side effects depending on
   * the getter function.
   * @default `false`
   */
  getters?: "get" | "set" | boolean | undefined;
  showHidden?: boolean | undefined;
  /**
   * @default 2
   */
  depth?: number | null | undefined;
  colors?: boolean | undefined;
  customInspect?: boolean | undefined;
  showProxy?: boolean | undefined;
  maxArrayLength?: number | null | undefined;
  /**
   * Specifies the maximum number of characters to
   * include when formatting. Set to `null` or `Infinity` to show all elements.
   * Set to `0` or negative to show no characters.
   * @default 10000
   */
  maxStringLength?: number | null | undefined;
  breakLength?: number | undefined;
  /**
   * Setting this to `false` causes each object key
   * to be displayed on a new line. It will also add new lines to text that is
   * longer than `breakLength`. If set to a number, the most `n` inner elements
   * are united on a single line as long as all properties fit into
   * `breakLength`. Short array elements are also grouped together. Note that no
   * text will be reduced below 16 characters, no matter the `breakLength` size.
   * For more information, see the example below.
   * @default `true`
   */
  compact?: boolean | number | undefined;
  sorted?: boolean | ((a: string, b: string) => number) | undefined;
}

function logLevelFrom(
  level: string | undefined,
  from: string
): LogLevel | undefined {
  if (level === undefined) {
    return undefined;
  } else {
    switch (level.toLowerCase()) {
      case "trace":
        return LogLevel.Trace;
      case "debug":
        return LogLevel.Debug;
      case "info":
        return LogLevel.Info;
      case "warn":
        return LogLevel.Warn;
      case "error":
        return LogLevel.Error;
      case "bug":
        return LogLevel.Bug;
      case "silent":
        return LogLevel.Silent;
      default:
        console.warn(
          `unexpected value for ${from} (${JSON.stringify(
            level
          )}). Expected one of: trace, debug, info, warn, error, bug, silent.`
        );

        return undefined;
    }
  }
}

const DEFAULT_LEVEL = LogLevel.Warn;

export class Logger {
  static default(): TraceMethods & TraceLevels {
    let console = () => globalThis.console;

    return new Logger(
      console,
      undefined,
      LogLevel.Info,
      false
    ) as TraceMethods & TraceLevels;
  }

  static create(
    console: TraceConsole,
    level: LogLevel = DEFAULT_LEVEL,
    as: LogLevel = LogLevel.Info
  ): Logger {
    return new Logger(() => console, level, as, false);
  }

  readonly #specifiedLevel: LogLevel | undefined;
  readonly #as: LogLevel;
  readonly #withStack: boolean;
  readonly #console: () => TraceConsole;

  // readonly trace: Logger;
  // readonly debug: Logger;
  // readonly info: Logger;
  // readonly warn: Logger;
  // readonly error: Logger;
  // readonly bug: Logger;

  constructor(
    console: () => TraceConsole,
    specifiedLevel: LogLevel | undefined,
    as: LogLevel,
    withStack: boolean
  ) {
    this.#console = console;
    this.#specifiedLevel = specifiedLevel;
    this.#as = as;
    this.#withStack = withStack;

    // this.trace = new Logger(this.#console, this.#level, LogLevel.Trace);
    // this.debug = new Logger(this.#console, this.#level, LogLevel.Debug);
    // this.info = new Logger(this.#console, this.#level, LogLevel.Trace);
    // this.warn = new Logger(this.#console, this.#level, LogLevel.Warn);
    // this.error = new Logger(this.#console, this.#level, LogLevel.Error);
    // this.bug = new Logger(this.#console, this.#level, LogLevel.Bug);
  }

  get #level(): LogLevel {
    if (this.#specifiedLevel) {
      return this.#specifiedLevel;
    } else {
      return currentLevel();
    }
  }

  get trace(): Logger {
    return new Logger(
      this.#console,
      this.#specifiedLevel,
      LogLevel.Trace,
      this.#withStack
    );
  }

  get warn(): Logger {
    return new Logger(
      this.#console,
      this.#specifiedLevel,
      LogLevel.Warn,
      this.#withStack
    );
  }

  get withStack(): Logger {
    return new Logger(this.#console, this.#specifiedLevel, this.#as, true);
  }

  get #shouldLog(): boolean {
    return this.#as >= this.#level;
  }

  log(...args: unknown[]): void {
    if (this.#shouldLog) {
      if (this.#withStack) {
        this.#console().trace(...args);
      } else {
        this.#console().log(...args);
      }
    }
  }

  group(description: string, callback?: () => unknown): unknown {
    if (!this.#shouldLog) {
      if (callback) {
        return callback();
      } else {
        return Group.start(this.#console(), description, this.#shouldLog);
      }
    }

    if (callback) {
      this.#console().group(description);

      if (this.#withStack) {
        console.trace("logged at");
      }

      try {
        return callback();
      } finally {
        this.#console().groupEnd();
      }
    } else {
      return Group.start(this.#console(), description, this.#shouldLog);
    }
  }
}

function currentLevel() {
  return (
    logLevelFrom(CONFIG.get("LogLevel"), CONFIG.describe("LogLevel")) ??
    DEFAULT_LEVEL
  );
}

/**
 * @strip.statement
 */
export const LOGGER = Logger.default();
