/**
 * This API might gain additional features. For now, its primary purpose is to
 * provide a sanctioned way to log to the console that is overtly different
 * from explicit calls to `console.log` (which make it more difficult to
 * identify errant console.logs).
 */
export class Logger {
  static console(): Logger {
    return new Logger(console);
  }

  static of(logger: typeof console): Logger {
    return new Logger(logger);
  }

  readonly #logger: typeof console;

  private constructor(logger: typeof console) {
    this.#logger = logger;
  }

  group(...args: unknown[]): void {
    this.#logger.group(...args);
  }

  groupEnd(): void {
    this.#logger.groupEnd();
  }

  info(...args: unknown[]): void {
    this.#logger.info(...args);
  }
}

export const LOGGER = Logger.console();
