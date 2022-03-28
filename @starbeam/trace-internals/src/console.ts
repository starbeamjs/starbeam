import type { ConsoleCommand, TraceConsole } from "./trace.js";

interface OriginalMethods {
  console: TraceConsole;
  log: Function;
  warn: Function;
  debug: Function;
  trace: Function;
  group: Function;
  groupCollapsed: Function;
}

export class CurrentConsole {
  static global(): CurrentConsole {
    const console = globalThis.console;
    return new CurrentConsole(() => globalThis.console, {
      console,
      log: console.log,
      warn: console.warn,
      debug: console.debug,
      trace: console.trace,
      group: console.group,
      groupCollapsed: console.groupCollapsed,
    });
  }

  readonly #current: () => TraceConsole;
  readonly #original: OriginalMethods;

  constructor(current: () => TraceConsole, original: OriginalMethods) {
    this.#current = current;
    this.#original = original;
  }

  // TODO: ANSI
  style(method: ConsoleCommand): "plain" | "css" {
    return this.#isOriginal(method) ? "css" : "plain";
  }

  #isOriginal(method: ConsoleCommand): boolean {
    if (this.#original.console !== this.#current()) {
      return false;
    }

    if (this.#original[method] !== this.#current()[method]) {
      return false;
    }

    return true;
  }

  get current(): TraceConsole {
    return this.#current();
  }
}
