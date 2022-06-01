export enum LogLevel {
  Trace = 0,
  Debug = 1,
  Info = 2,
  Warn = 3,
  Error = 4,
  Fatal = 5,
}

export class LoggerAsLevel {
  #logger: Logger;
  #level: LogLevel;
  #config: LoggerConfig;

  constructor(logger: Logger, level: LogLevel, config: LoggerConfig) {
    this.#logger = logger;
    this.#level = level;
    this.#config = config;
  }

  log(arg: unknown, ...args: unknown[]): void {
    if (this.#level >= this.#config.minimum) {
      this.#logger.send(this.#level, { args: [arg, ...args] });
    }
  }

  get withStack(): LoggerWithStack {
    return new LoggerWithStack(this.#logger, this.#level, this.#config);
  }
}

export class LoggerWithStack {
  #logger: Logger;
  #level: LogLevel;
  #config: LoggerConfig;

  constructor(logger: Logger, level: LogLevel, config: LoggerConfig) {
    this.#logger = logger;
    this.#level = level;
    this.#config = config;
  }

  log(arg: unknown, ...args: unknown[]): void {
    if (this.#level >= this.#config.minimum) {
      this.#logger.send(this.#level, { args: [arg, ...args], stack: true });
    }
  }
}

interface LoggerConfig {
  readonly minimum: LogLevel;
}

export class Logger {
  #console: Console;
  #config: LoggerConfig;

  readonly trace: LoggerAsLevel;
  readonly debug: LoggerAsLevel;
  readonly info: LoggerAsLevel;
  readonly warn: LoggerAsLevel;
  readonly error: LoggerAsLevel;
  readonly fatal: LoggerAsLevel;

  constructor(console: Console, config: LoggerConfig) {
    this.#console = console;
    this.#config = config;

    this.trace = new LoggerAsLevel(this, LogLevel.Trace, config);
    this.debug = new LoggerAsLevel(this, LogLevel.Debug, config);
    this.info = new LoggerAsLevel(this, LogLevel.Info, config);
    this.warn = new LoggerAsLevel(this, LogLevel.Warn, config);
    this.error = new LoggerAsLevel(this, LogLevel.Error, config);
    this.fatal = new LoggerAsLevel(this, LogLevel.Fatal, config);
  }

  configure(config: Partial<LoggerConfig>): void {
    Object.assign(this.#config, config);
  }

  send(
    level: LogLevel,
    { args, stack }: { args: unknown[]; stack?: boolean }
  ): void {
    if (level === LogLevel.Trace) {
      if (stack) {
        this.#console.trace(...args);
      } else {
        this.#console.debug(...args);
      }
    }

    this.#console.groupCollapsed("stack trace");
    this.#console.trace();
    this.#console.groupEnd();

    switch (level) {
      case LogLevel.Trace:
        if (stack) {
          this.#console.trace(...args);
        } else {
          this.#console.debug(...args);
        }
        break;
      case LogLevel.Debug:
        this.#console.debug(...args);
        break;
      case LogLevel.Info:
        this.#console.log(...args);
        break;
      case LogLevel.Warn:
        this.#console.warn(...args);
        break;
      case LogLevel.Error:
        this.#console.error(...args);
        break;
      case LogLevel.Fatal:
        this.#console.error(...args);
        break;
    }
  }
}
export const LOGGER = new Logger(globalThis.console, {
  minimum: LogLevel.Warn,
});
