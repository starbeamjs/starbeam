import chalk from "chalk";
import { inspect } from "node:util";
import { wrapIndented } from "../format.js";

export interface FormatOptions {
  readonly multiline: boolean;
  readonly indent: number;
  readonly breakBefore: boolean;
}

export type Header =
  | { type: "none" }
  | {
      type: "always";
      message: string;
      empty: string;
      nested: boolean;
      options: FormatOptions;
    }
  | {
      type: "if:contents";
      message: string;
      nested: boolean;
      options: FormatOptions;
    };

const LoggerState = {
  needsClose(state: LoggerState): boolean {
    if (state.status !== "group" || state.didPrint === false) {
      return false;
    }

    const header = state.header;

    return header.type !== "none" && header.nested;
  },
};

interface GroupState {
  readonly status: "group";
  didPrint: boolean;
  readonly header: Header;
}

export type LoggerState =
  | {
      readonly status: "top";
    }
  | GroupState;

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

export class Logger {
  static create(): Logger {
    return new Logger();
  }

  #states: LoggerState[];

  readonly loggers = LOGGERS;

  private constructor() {
    this.#states = [
      {
        status: "top",
      },
    ];
  }

  get #state(): LoggerState {
    return this.#states[this.#states.length - 1];
  }

  get #groupState(): GroupState {
    const state = this.#state;

    switch (state.status) {
      case "top":
        throw Error("No open group to close");

      case "group":
        return state;
    }
  }

  notifyPrinted(): void {
    switch (this.#state.status) {
      case "top":
        return;
      case "group": {
        this.#state.didPrint = true;
      }
    }
  }

  get didPrint(): boolean {
    switch (this.#state.status) {
      case "top":
        throw Error("Cannot get didPrint in top state");

      case "group":
        return this.#state.didPrint;
    }
  }

  begin(header?: Header): void {
    this.#states.push({
      status: "group",
      header: header ?? { type: "none" },
      didPrint: false,
    });
  }

  end(): void {
    const state = this.#groupState;

    if (LoggerState.needsClose(state)) {
      console.groupEnd();
    }

    this.#states.pop();

    if (state.didPrint) {
      this.notifyPrinted();
    }
  }

  newline(): void {
    this.#flushHeaders({ printing: true });
    console.log("");
  }

  async exit(code: number): Promise<never> {
    // this promise is never fulfilled, because it is blocking execution flow on process exit.
    return new Promise(() => {
      // if there are any open groups, close them
      this.#flushHeaders({ printing: false });
      process.stdout.once("drain", () => {
        process.exit(code);
      });
      process.stdout.write("");
    });
  }

  logGroupStart(message: string): void {
    this.flush();
    this.notifyPrinted();

    console.group(message);
  }

  logGroupEnd(): void {
    console.groupEnd();
  }

  line(logger: LoggerName | LogFunction, message = ""): void {
    this.flush();
    this.notifyPrinted();

    if (typeof logger === "function") {
      logger(message);
    } else {
      this.loggers[logger](message);
    }
  }

  reportError(e: unknown): void {
    this.flush();

    console.log(chalk.red("An unexpected error occurred:"));

    if (e && e instanceof Error) {
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

  flush(): void {
    this.#flushHeaders({ printing: false });
  }

  #flushHeaders({ printing }: { printing: boolean }): void {
    this.#states = this.#states.map((state) => {
      switch (state.status) {
        case "top":
          return state;

        case "group": {
          if (!state.didPrint) {
            state.didPrint ||= printing || this.#flushHeader(state);
          }
          return state;
        }
      }
    });
  }

  #flushHeader(state: GroupState): boolean {
    const { header } = state;

    if (header.type === "none") {
      return false;
    }

    const formatted = this.#format(header);

    if (header.nested) {
      console.group(formatted);
    } else {
      console.log(formatted);
    }

    return true;
  }

  #format(header: { type: "none" }): null;
  #format(header: Header): string;
  #format(header: Header): string | null {
    switch (header.type) {
      case "none":
        return null;
      default:
        return format(header);
    }
  }
}

export function format({
  message,
  options,
}: {
  message: string;
  options: FormatOptions;
}): string {
  return wrapIndented(message, options.indent);
}
