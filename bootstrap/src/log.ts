import * as util from "util";

const LABEL = Symbol("LABEL");
type LABEL = typeof LABEL;

interface Label {
  readonly [LABEL]: readonly string[];
}

function Label(...label: string[]): Label {
  return { [LABEL]: label };
}

function isLabel(value: unknown): value is Label {
  return typeof value === "object" && value !== null && LABEL in value;
}

export interface Log {
  (value: unknown): Log;
  (label: string, value: unknown): Log;
  (label: unknown): Log;

  readonly log: Log;
  readonly silent: Log;

  newline(): Log;
  heading(...label: string[]): Log;

  error(...label: string[]): Log;

  readonly inspect: {
    (value: unknown, options?: util.InspectOptions): Log;
    labeled(
      label: string | Label,
      value: unknown,
      options?: util.InspectOptions
    ): Log;
  };
}

const SILENT: Log = (() => {
  const log = (..._args: unknown[]): Log => SILENT;
  log.log = log;
  log.silent = log;

  log.newline = () => log;
  log.heading = (..._label: string[]) => log;
  log.error = (..._label: string[]) => log;

  const inspect = (_value: unknown, _options?: util.InspectOptions) => log;
  inspect.labeled = (..._args: unknown[]): Log => log;
  log.inspect = inspect;

  return log;
})();

const NORMAL: Log = (() => {
  function log(value: unknown): Log;
  function log(label: string, value: unknown): Log;
  function log(label: unknown): Log;
  function log(
    ...args: [value: unknown] | [label: string, value: unknown] | [Label]
  ): Log {
    if (args.length === 2) {
      let [label, value] = args;
      console.log(label, util.inspect(value, { depth: null, colors: true }));
    } else {
      let [value] = args;

      if (isLabel(value)) {
        console.log(...value[LABEL]);
      } else {
        console.log(util.inspect(value, { depth: null, colors: true }));
      }
    }

    return log;
  }

  log.silent = SILENT;
  log.log = log;

  log.error = (...label: string[]): typeof log => {
    console.error(...label);
    return log;
  };

  log.newline = (): typeof log => {
    console.log("\n");
    return log;
  };

  log.heading = (...label: string[]): typeof log => {
    console.log(...label);
    return log;
  };

  const logLabeled = (
    label: string | Label,
    value: unknown,
    options?: util.InspectOptions
  ): typeof log => {
    logLabeledValue(label, value, options);
    return log;
  };

  const logInspect = (
    value: unknown,
    options?: util.InspectOptions
  ): typeof log => {
    console.log(inspect(value, options));
    return log;
  };

  logInspect.labeled = logLabeled;

  log.inspect = logInspect;

  function logLabeledValue(
    label: string | Label,
    value: unknown,
    options: util.InspectOptions = {}
  ): void {
    if (isLabel(label)) {
      console.log(...label[LABEL], inspect(value, options));
    } else {
      console.log(label, inspect(value, options));
    }
  }

  return log;
})();

export const log = NORMAL;

function inspect(value: unknown, options: util.InspectOptions = {}): string {
  return util.inspect(value, { ...options, depth: null, colors: true });
}

function logged<T>(value: T, description: string, shouldLog = true): T {
  if (shouldLog) {
    console.log(
      description,
      "=",
      util.inspect(value, { depth: null, colors: true })
    );
  }
  return value;
}
