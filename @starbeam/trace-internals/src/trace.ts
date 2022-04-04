import type { Frame } from "@starbeam/debug-utils";
import { exhaustive } from "@starbeam/verify";
import { Abstraction } from "./abstraction.js";
import { assert } from "./assert.js";
import { CurrentConsole } from "./console.js";
import {
  delimited,
  group,
  IntoStyled,
  Line,
  SP,
  Styled,
  StyledFragment,
  StyledLine,
  type LogArgs,
} from "./fragment.js";
import { enumerate } from "./itertools.js";
import { capture } from "./match.js";
import { SHEET } from "./sheet.js";

export enum LogLevel {
  Trace = 0b0000001,
  Debug = 0b0000010,
  Info = 0b0000100,
  Warn = 0b0001000,
  Error = 0b0010000,
  Bug = 0b0100000,
  Silent = 0b1000000,
}

const LEVEL_NAMES = {
  [LogLevel.Trace]: "trace",
  [LogLevel.Debug]: "debug",
  [LogLevel.Info]: "info",
  [LogLevel.Warn]: "warn",
  [LogLevel.Error]: "error",
  [LogLevel.Bug]: "bug",
  [LogLevel.Silent]: "silent",
} as const;

function describeLevel(level: LogLevel): string {
  return LEVEL_NAMES[level];
}

const TRACE_LEVELS = [
  LogLevel.Trace,
  LogLevel.Debug,
  LogLevel.Info,
  LogLevel.Warn,
  LogLevel.Error,
  LogLevel.Bug,
];

interface TraceLevels {
  readonly trace: TraceMethods;
  readonly debug: TraceMethods;
  readonly info: TraceMethods;
  readonly warn: TraceMethods;
  readonly error: TraceMethods;
  readonly bug: TraceMethods;
}

export interface TraceConsole {
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

interface Formatter {
  readonly line: FormatterFunction;
  readonly heading: FormatterFunction;
}

function Formatter(formatter: FormatterFunction): Formatter {
  return {
    line: formatter,
    heading: formatter,
  };
}

type FormatterFunction = (options: {
  line: StyledLine;
  scope: Scope;
  level: LogLevel;
  console: CurrentConsole;
}) => StyledLine;

interface GroupOptions {
  readonly emitter: Emitter;
  readonly scope: Scope;
  readonly formatter: Formatter;
  readonly args: LogArgs;
}

export class Group {
  static start(options: GroupOptions): Group {
    return new Group(options, false);
  }

  readonly #options: GroupOptions;
  #started: boolean;

  private constructor(options: GroupOptions, started: boolean) {
    this.#options = options;
    this.#started = started;
  }

  collapsed(): Group;
  collapsed<T>(callback: () => T): T;
  collapsed(callback?: () => unknown): unknown {
    this.#started = true;

    this.#emitter.group("collapsed", ...this.#options.args);

    if (callback) {
      try {
        return callback();
      } finally {
        this.#emitter.groupEnd();
      }
    } else {
      return this;
    }
  }

  get #emitter(): Emitter {
    return this.#options.emitter;
  }

  expanded(): Group {
    this.#started = true;
    this.#emitter.group("expanded", this.#options.args);

    return this;
  }

  end(): void {
    assert(
      this.#started,
      `You must call group.expanded() or group.collapsed() before group.end()`
    );

    this.#emitter.groupEnd();
  }
}

interface TraceModifiers {
  readonly withStack: TraceMethods;
}

interface TraceMethods extends TraceModifiers {
  log(...args: LogArgs): void;

  group(args: string | LogArgs): Group;
  group<T>(args: string | LogArgs, callback: () => T): T;

  /**
   * This method mutates the original logger, so you can't use it to create
   * separate loggers with separate matchers.
   *
   * This is probably good to fix using a persistent data structure instead of a
   * map.
   */
  level(matcher: string, level: LogLevel): this;

  scoped(scope: string): Logger;
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

type Split<
  S extends string,
  Sep extends string,
  SoFar extends string[] = []
> = S extends `${infer Head}${Sep}${infer Rest}`
  ? Split<Rest, Sep, [...SoFar, Head]>
  : [...SoFar, S];

function split<S extends string, Sep extends string>(
  string: S,
  sep: Sep
): Split<S, Sep> {
  return string.split(sep) as Split<S, Sep>;
}

type ParseScope<S extends string> = Split<S, "/">;

type MatcherPart =
  /** matches any segment */
  | "*"
  /** matches any number of segments, must be the final segment */
  | "**"
  | string;

class ScopeMatcher<Parts extends readonly string[]> {
  static parse<S extends string>(scope: S): ScopeMatcher<Split<S, "/">> {
    return new ScopeMatcher(split(scope, "/"));
  }

  readonly #parts: Parts;

  constructor(parts: Parts) {
    this.#parts = parts;
  }

  matches(scope: string | Scope) {
    const scopeObject =
      typeof scope === "string" ? NestedScope.parse(scope) : scope;
    const segments = scopeObject.segments;

    for (let [i, part] of enumerate(this.#parts)) {
      const scopeSegment = segments[i];

      if (scopeSegment === null) {
        if (part === "**") {
          continue;
        } else {
          return false;
        }
      }

      if (part === "*") {
        continue;
      }

      if (part !== scopeSegment) {
        return false;
      }
    }

    return true;
  }
}

abstract class AbstractScope {
  abstract get segments(): readonly string[];

  get path() {
    return this.segments.join("/");
  }
}

interface Location {
  readonly line: string;
  readonly column: string;
}

interface LocationOptions {
  readonly package: string;
  readonly file: string;
  readonly tag?: string;
  readonly location?: Location;
}

export class LocationScope extends AbstractScope {
  static create(frame: Frame): LocationScope {
    return new LocationScope(frame);
  }

  readonly #frame: Frame;

  constructor(frame: Frame) {
    super();
    this.#frame = frame;
  }

  get segments(): readonly string[] {
    const frame = this.#frame;
    const { parsed } = frame;

    const segments: string[] = [];

    if (parsed) {
      const { source } = parsed;

      if (source.isPackage()) {
        const path = source.sourcePath;

        if (path.scope) {
          segments.push(path.scope);
        }

        segments.push(path.fullName);
      }

      if (parsed.source.path) {
        segments.push(parsed.source.path);
      }

      if (parsed.action) {
        segments.push(parsed.action.original);
      }
    } else if (frame.source) {
      segments.push(frame.source);
    }

    if (frame.location) {
      segments.push(String(frame.location.line), String(frame.location.column));
    }

    return segments;
  }

  get package(): string | null {
    return this.#frame.package;
  }

  get source(): string | null {
    return this.#frame.fullPath;
  }

  get action(): string | null {
    return this.#frame.action;
  }

  get location(): Location | null {
    const { location } = this.#frame;

    if (!location) {
      return null;
    }

    return { line: String(location.line), column: String(location.column) };
  }

  toString() {
    return `${this.#frame.package}::${this.#frame.localPath}${
      this.#frame.action ? `@${this.#frame.action}` : ""
    }${
      this.#frame.location
        ? `:${this.#frame.location.line}:${this.#frame.location.column}`
        : ""
    }`;
  }
}

class NestedScope<
  Parts extends readonly string[] = readonly string[]
> extends AbstractScope {
  static parse<S extends string>(scope: S): NestedScope<Split<S, "/">> {
    return new NestedScope(split(scope, "/"));
  }

  readonly #parts: Parts;

  constructor(parts: Parts) {
    super();
    this.#parts = parts;
  }

  get segments(): readonly string[] {
    return this.#parts;
  }

  at(index: number): string | null {
    return this.#parts[index] ?? null;
  }

  matches(pattern: string) {
    const matcher = ScopeMatcher.parse(pattern);
    return matcher.matches(this);
  }

  toString(): string {
    return this.#parts.join("/");
  }
}

export type Scope = LocationScope | NestedScope;

const INERT = "color: #999";
const LABEL = "color: #797";
const VALUE = "color: #5b5";

function styledLog(
  ...parts: [fragment: string, style: string][]
): readonly string[] {
  const styles: string[] = [];
  let label = "";

  for (let [fragment, style] of parts) {
    styles.push(style);
    label += `%c${fragment}`;
  }

  return [label, ...styles];
}

enum Order {
  /** the first side is smaller than the second side */
  Less = -1,
  /** The two sides are equal */
  Equal = 0,
  /** the first side is larger than the second side */
  Greater = 1,
}

function max<T, U>(
  list: readonly T[],
  compare: (a: T, b: T) => Order,
  options: {
    map: (value: T) => U;
    ifEmpty: () => U;
  }
): U;
function max<T, U>(
  list: readonly T[],
  compare: (a: T, b: T) => Order,
  options: {
    ifEmpty: () => U;
  }
): T | U;
function max<T, U>(
  list: readonly T[],
  compare: (a: T, b: T) => Order,
  options: {
    map?: (value: T) => U;
    ifEmpty: () => U;
  }
): T | U {
  const sorted = [...list].sort(compare);

  if (sorted.length === 0) {
    return options.ifEmpty();
  } else {
    return options.map
      ? options.map(sorted[sorted.length - 1])
      : sorted[sorted.length - 1];
  }
}

class Specificity {
  constructor(
    readonly pattern: string,
    /** The size of the constant portions */
    readonly constant: number,
    /** An array of the captures */
    readonly captures: readonly string[]
  ) {}

  get dynamic(): number {
    return this.captures.reduce((sum, string) => sum + string.length, 0);
  }

  compare(other: Specificity): Order {
    if (this.constant < other.constant) {
      return Order.Less;
    } else if (this.constant > other.constant) {
      return Order.Greater;
    } else {
      return Order.Equal;
    }
  }
}

function cmp(left: number, right: number): Order {
  if (left < right) {
    return Order.Less;
  } else if (left > right) {
    return Order.Greater;
  } else {
    return Order.Equal;
  }
}

class Matcher {
  static from(pattern: string) {
    return new Matcher(pattern);
  }

  readonly #pattern: string;

  constructor(pattern: string) {
    this.#pattern = pattern;
  }

  matches(path: string): Specificity | null {
    const captures = capture({ pattern: this.#pattern, path });

    if (captures === null || captures === undefined) {
      return null;
    }

    const dynamic = captures;
    console.log({ captures, dynamic });
    const dynamicSize = dynamic.reduce((sum, string) => sum + string.length, 0);
    return new Specificity(this.#pattern, path.length - dynamicSize, captures);
  }
}

class Matchers {
  static create(): Matchers {
    return new Matchers(new Map());
  }

  readonly #matchers: Map<string, { matcher: Matcher; level: LogLevel }>;

  private constructor(
    matchers: Map<string, { matcher: Matcher; level: LogLevel }>
  ) {
    this.#matchers = matchers;
  }

  add(pattern: string, level: LogLevel) {
    this.#matchers.set(pattern, { matcher: Matcher.from(pattern), level });

    if (false) {
      console.groupCollapsed(
        ...styledLog(
          ["Adding log matcher: ", INERT],
          ["pattern", LABEL],
          ["=", INERT],
          [pattern, VALUE],
          [", ", INERT],
          ["level", LABEL],
          ["=", INERT],
          [describeLevel(level), VALUE]
        )
      );
      console.trace();
      console.groupEnd();
    }
  }

  levelFor(scope: Scope | string): LogLevel {
    const scopeObject =
      typeof scope === "string" ? NestedScope.parse(scope) : scope;

    const matches: { match: Specificity; level: LogLevel }[] = [];

    for (const { matcher, level } of this.#matchers.values()) {
      const match = matcher.matches(scopeObject.path);

      if (match) {
        matches.push({ match, level });
      }
    }

    const selected = max(matches, (a, b) => a.match.compare(b.match), {
      map: (max) => max.level,
      ifEmpty: () => LogLevel.Silent,
    });

    if (false) {
      console.groupCollapsed(
        ...styledLog(["matches for ", INERT], [scopeObject.path, VALUE])
      );

      for (const { match, level } of matches) {
        console.log(
          ...styledLog(["pattern", LABEL], ["=", INERT], [match.pattern, VALUE])
        );
        console.log(
          ...styledLog(
            ["specificity", LABEL],
            ["=", INERT],
            [String(match.constant), VALUE],
            [":", INERT],
            [String(match.dynamic), VALUE]
          )
        );
        console.log(
          ...styledLog(
            ["level", LABEL],
            ["=", INERT],
            [describeLevel(level), VALUE]
          )
        );
      }

      console.log(
        ...styledLog(
          ["selected", INERT],
          [" ", ""],
          [describeLevel(selected), VALUE]
        )
      );

      console.groupEnd();
    }

    return selected;
  }
}

interface LoggerOptions {
  readonly asLevel: LogLevel;
  readonly withStack: boolean;
  readonly console: CurrentConsole;
  readonly matchers: Matchers;
  // the scope to use for all logs
  readonly asScope: Scope | undefined;
  // The default scope to use when a scope cannot be determined. In general, a
  // scope will be inferred via Abstraction.callerScope, but if it doesn't work,
  // use the defaultScope instead.
  readonly defaultScope: Scope;

  readonly formatter: Formatter;
}

const DEFAULT_GENERIC_FORMATTER: FormatterFunction = ({
  line,
  scope,
  level,
}) => {
  function format(): { line: StyledLine; scope: Styled } {
    if (scope instanceof LocationScope) {
      let scopeParts: IntoStyled[] = [];

      if (scope.package) {
        scopeParts.push(SHEET.green(scope.package));
      }

      if (scope.action) {
        scopeParts.push(SP, SHEET.inert("@"), SP, SHEET.red(scope.action));
      }

      scopeParts = [
        delimited(
          SHEET.inert("["),
          group(...scopeParts),
          SHEET.inert("]")
        ).attribute("heading", true),
      ];

      if (scope.location) {
        scopeParts.push(
          SP,
          group(
            group(SHEET.dim(":"), SHEET.inert(scope.location.line)),
            group(SHEET.dim(":"), SHEET.inert(scope.location.column))
          ),
          SP
        );
      }

      let styledScope = group(...scopeParts);

      if (false) {
        styledScope = group(
          scope,
          SP,
          delimited(
            SHEET.inert("["),
            SHEET.green(scope.segments.join("/")),
            SHEET.inert("]")
          )
        );
      }

      return {
        line: line.join(SP),
        scope: styledScope,
      };
    } else {
      const scopeString = scope.segments.join("/");
      return {
        line,
        scope: delimited(
          SHEET.inert("["),
          SHEET.green(scopeString),
          SHEET.inert("]")
        ).attribute("heading", true),
      };
    }
  }

  const formatted = format();
  const described = `${describeLevel(level).toUpperCase()}`.padEnd(6, " ");
  const describedLevel = IntoStyled(
    SHEET.dim(`${described}>`).attribute("emphasis", "Bold")
  ).attribute("heading", true);

  if (formatted.line.isMultiline()) {
    return formatted.line.prepend(
      describedLevel,
      SP,
      SP,
      SP,
      formatted.scope,
      "\n"
    );
  } else {
    return formatted.line
      .prepend(describedLevel, SP)
      .append(SP, SP, SP, formatted.scope);
  }
};

const DEFAULT_FORMATTER: Formatter = {
  heading: DEFAULT_GENERIC_FORMATTER,
  line: ({ scope, line, level, console }) => {
    const formatted = DEFAULT_GENERIC_FORMATTER({
      scope,
      line,
      level,
      console,
    });
    const spacer = StyledFragment.create(
      " ",
      "width: 16px; overflow: hidden"
    ).attribute("collapsed", true);
    return formatted.prepend(spacer);
  },
};

export class Logger implements TraceMethods, TraceModifiers {
  static scoped(rootScope: string): TraceMethods & TraceLevels {
    return new Logger({
      console: CurrentConsole.global(),
      asLevel: LogLevel.Info,
      withStack: false,
      matchers: Matchers.create(),
      asScope: undefined,
      defaultScope: NestedScope.parse(rootScope),
      formatter: DEFAULT_FORMATTER,
    }) as TraceMethods & TraceLevels;
  }

  readonly #options: LoggerOptions;

  // readonly #specifiedLevel: LogLevel | undefined;
  // readonly #as: LogLevel;
  // readonly #withStack: boolean;
  // readonly #console: () => TraceConsole;

  // readonly trace: Logger;
  // readonly debug: Logger;
  // readonly info: Logger;
  // readonly warn: Logger;
  // readonly error: Logger;
  // readonly bug: Logger;

  constructor(options: LoggerOptions) {
    this.#options = options;

    // this.trace = new Logger(this.#console, this.#level, LogLevel.Trace);
    // this.debug = new Logger(this.#console, this.#level, LogLevel.Debug);
    // this.info = new Logger(this.#console, this.#level, LogLevel.Trace);
    // this.warn = new Logger(this.#console, this.#level, LogLevel.Warn);
    // this.error = new Logger(this.#console, this.#level, LogLevel.Error);
    // this.bug = new Logger(this.#console, this.#level, LogLevel.Bug);
  }

  #levelFor(scope: Scope) {
    return this.#options.matchers.levelFor(scope);
  }

  get #formatter(): Formatter {
    return this.#options.formatter;
  }

  get trace(): Logger {
    return this.#withLevel(LogLevel.Trace);
  }

  get debug(): Logger {
    return this.#withLevel(LogLevel.Debug);
  }

  get info(): Logger {
    return this.#withLevel(LogLevel.Info);
  }

  get warn(): Logger {
    return this.#withLevel(LogLevel.Warn);
  }

  get error(): Logger {
    return this.#withLevel(LogLevel.Error);
  }

  get bug(): Logger {
    return this.#withLevel(LogLevel.Bug);
  }

  #withLevel(level: LogLevel): Logger {
    return new Logger({
      ...this.#options,
      asLevel: level,
    });
  }

  get withStack(): Logger {
    return new Logger({
      ...this.#options,
      withStack: true,
    });
  }

  level(matcher: string, level: LogLevel): this {
    this.#options.matchers.add(matcher, level);
    return this;
  }

  scoped(scope: string): Logger {
    return new Logger({
      ...this.#options,
      asScope: NestedScope.parse(scope),
    });
  }

  #shouldLog(scope: Scope): boolean {
    return this.#options.asLevel >= this.#levelFor(scope);
  }

  #inferScope(internal = 0): Scope {
    if (this.#options.asScope) {
      return this.#options.asScope;
    }

    return Abstraction.callerScope(internal + 1) ?? this.#options.defaultScope;
  }

  log(...args: LogArgs): void {
    const scope = this.#inferScope(1);
    const emitter = this.#emitter(scope);

    if (this.#shouldLog(scope)) {
      if (this.#options.withStack) {
        emitter.emit("trace", args);
      } else {
        emitter.emit("log", args);
      }
    }
  }

  group<T>(args: string | LogArgs, callback: () => T): T;
  group<T>(args: string | LogArgs): T;
  group(args: string | LogArgs, callback?: () => unknown): unknown {
    const scope = this.#inferScope(1);
    const shouldLog = this.#shouldLog(scope);
    const argList = typeof args === "string" ? [args] : args;
    const emitter = this.#emitter(scope);

    if (callback) {
      emitter.group("expanded", ...argList);

      if (this.#options.withStack) {
        emitter.emit("trace", ["logged at"]);
      }

      try {
        return callback();
      } finally {
        emitter.groupEnd();
      }
    } else {
      return this.#startGroup({ args: argList, scope, shouldLog });
    }
  }

  #emitter(scope: Scope): Emitter {
    return Emitter.create(
      scope,
      this.#shouldLog(scope),
      this.#options.asLevel,
      this.#formatter,
      this.#options.console
    );
  }

  #startGroup({
    args,
    scope,
    shouldLog,
  }: {
    args: LogArgs;
    scope: Scope;
    shouldLog: boolean;
  }): Group {
    return Group.start({
      emitter: this.#emitter(scope),
      scope,
      formatter: this.#formatter,
      args,
    });
  }
}

type SingleEmit = [
  command: SingleCommand | [command: SingleCommand, format: keyof Formatter],
  args: LogArgs
];

type Emit =
  | [
      command:
        | ConsoleCommand
        | [console: ConsoleCommand, format: keyof Formatter],
      args: LogArgs
    ]
  | [command: "groupEnd", args: []];

function emitCommand(emit: SingleEmit): ConsoleCommand {
  const command = emit[0];

  if (Array.isArray(command)) {
    return command[0];
  } else {
    return command;
  }
}

interface GroupTracker {
  readonly command: "group" | "groupCollapsed";
  readonly header: LogArgs;
  readonly body: Emit[];
}

class Emitter {
  static create(
    scope: Scope,
    shouldLog: boolean,
    asLevel: LogLevel,
    formatter: Formatter,
    console: CurrentConsole
  ): Emitter {
    return new Emitter(scope, shouldLog, asLevel, formatter, console, []);
  }

  readonly #scope: Scope;
  readonly #shouldLog: boolean;
  readonly #asLevel: LogLevel;
  readonly #formatter: Formatter;
  readonly #console: CurrentConsole;
  readonly #buffered: GroupTracker[];

  constructor(
    scope: Scope,
    shouldLog: boolean,
    asLevel: LogLevel,
    formatter: Formatter,
    console: CurrentConsole,
    buffered: GroupTracker[]
  ) {
    this.#scope = scope;
    this.#shouldLog = shouldLog;
    this.#asLevel = asLevel;
    this.#formatter = formatter;
    this.#console = console;
    this.#buffered = buffered;
  }

  emit(...emit: [(scope: Scope) => SingleEmit] | SingleEmit): void {
    if (this.#shouldLog === false) {
      return;
    }

    if (typeof emit[0] === "function") {
      const normalized = emit[0](this.#scope);
      this.#handleSingle(normalized);
    } else {
      this.#handleSingle([
        emit[0],
        typeof emit[1] === "string" ? [emit[1]] : emit[1],
      ] as SingleEmit);
    }
  }

  group(style: "expanded" | "collapsed", ...args: LogArgs): void {
    if (this.#shouldLog) {
      const command: GroupCommand =
        style === "expanded" ? "group" : "groupCollapsed";
      this.#buffered.push({ header: args, command, body: [] });
    }
  }

  groupEnd(): void {
    if (this.#shouldLog) {
      const group = this.#buffered.pop();

      if (group === undefined) {
        throw Error(`BUG: unbalanced group/groupCollapsed and groupEnd`);
      }

      const parent = this.#buffered.pop();
      const collect = parent ? parent.body : [];

      const body = group.body;

      if (body.length === 0) {
        collect.push(["log", group.header]);
      } else {
        collect.push([group.command, group.header]);
        collect.push(...body);
        collect.push(["groupEnd", []]);
      }

      if (parent) {
        this.#buffered.push(parent);
      } else {
        for (let item of collect) {
          this.#emitNow(item);
        }
      }
    }
  }

  #handleSingle(emit: SingleEmit) {
    const buffer = this.#buffered.pop();

    if (buffer) {
      buffer.body.push(emit);
      this.#buffered.push(buffer);
    } else {
      this.#emitNow(emit);
    }
  }

  #emitNow(
    emit: Emit
    // command:
    //   | ConsoleCommand
    //   | "groupEnd"
    //   | [console: ConsoleCommand, format: keyof Formatter],
    // args: LogArgs
  ) {
    if (this.#buffered.length > 0) {
      this.#buffered[this.#buffered.length - 1].body.push(emit);
      return;
    }

    const [command, args] = emit;

    let consoleCommand: ConsoleCommand;
    let lineStyle: LineStyle;

    if (Array.isArray(command)) {
      [consoleCommand, lineStyle] = command;
    } else if (command === "groupEnd") {
      this.#console.current.groupEnd();
      return;
    } else {
      consoleCommand = command;
      lineStyle = defaultLineStyle(command);
    }

    if (lineStyle === "line") {
      const line = this.#format(this.#scope, args, "heading");

      if (line.isMultiline()) {
        const oneline = line.oneline().attribute("heading", true);
        this.#console.current.group(
          ...oneline.toLogArgs(this.#console.style("group"))
        );
        this.#console.current[consoleCommand](
          ...line.toLogArgs(this.#console.style(consoleCommand))
        );
        this.#console.current.groupEnd();
        return;
      }
    }

    const line = this.#format(this.#scope, args, lineStyle);
    this.#console.current[consoleCommand](
      ...line.toLogArgs(this.#console.style(consoleCommand))
    );
  }

  #format(scope: Scope, args: string | LogArgs, style: LineStyle): StyledLine {
    const argList = typeof args === "string" ? [args] : args;
    const line = Line(argList);

    const formattedLine = this.#formatter[style]({
      line,
      scope,
      level: this.#asLevel,
      console: this.#console,
    });
    return formattedLine;
  }
}

interface Emitter {
  (callback: (scope: Scope) => Emit): void;
}

type LineStyle = keyof Formatter;
export type SingleCommand = "log" | "warn" | "debug" | "trace";
export type GroupCommand = "group" | "groupCollapsed";
export type ConsoleCommand = SingleCommand | GroupCommand;

function defaultLineStyle(style: ConsoleCommand): LineStyle {
  switch (style) {
    case "debug":
    case "log":
    case "warn":
      return "line";
    case "group":
    case "groupCollapsed":
    case "trace":
      return "heading";
    default:
      exhaustive(style, "style");
  }
}

/**
 * @strip.statement
 */
export const LOGGER = Logger.scoped("@starbeam").level(
  "@starbeam/**",
  LogLevel.Info
);

function getConsoleMethod(
  consoleCommand: ConsoleCommand,
  lineStyle: keyof Formatter,
  line?: StyledLine
) {
  if (line?.isMultiline()) {
  }
  throw new Error("Function not implemented.");
}
