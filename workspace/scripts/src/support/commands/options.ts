import {
  type ReporterOptions,
  wrapIndented,
} from "@starbeam-workspace/reporter";
import type { Workspace } from "@starbeam-workspace/workspace";
import chalk from "chalk";
import type { Command } from "commander";

export declare class CompileError<_S extends string = string, In = unknown> {
  #in: In;
}

export interface BasicOptions {
  description?: string | undefined;
  notes?: string | undefined;
}

export function applyBasicOptions(
  command: Command,
  options?: BasicOptions,
): Command {
  if (options?.description) {
    command = command.description(options.description);
  }

  if (options?.notes) {
    command = command.addHelpText(
      "afterAll",
      wrapIndented(chalk.yellow(`\n${options.notes}`), { leading: "auto" }),
    );
  }

  return withOptions(command);
}

export type Arg = `--${string}` | readonly [`-${string}`, `--${string}`];

export type LongFlag<A extends Arg> = A extends string ? A : A[1];
export type ShortFlag<A extends Arg> = A extends string ? never : A[0];

export type CheckOption<
  CheckArg extends string | readonly [short: string, long: string],
  Options,
  Short,
> = CheckArg extends [short: keyof Short & string, long: keyof Options & string]
  ? [
      short: CompileError<
        `Compile Error: ${CheckArg[0]} is already a short option alias in this command`,
        {
          [P in CheckArg[0]]: Short[CheckArg[0]];
        }
      >,
      long: CompileError<
        `Compile Error: ${CheckArg[1]} is already an option in this command`,
        {
          [P in CheckArg[1]]: Options[CheckArg[1]];
        }
      >,
    ]
  : CheckArg extends [short: string, long: keyof Options & string]
  ? [
      short: CheckArg[0],
      long: CompileError<
        `Compile Error: ${CheckArg[1]} is already an option in this command`,
        {
          [P in CheckArg[1]]: Options[CheckArg[1]];
        }
      >,
    ]
  : CheckArg extends [short: keyof Short & string, long: string]
  ? [
      short: CompileError<
        `Compile Error: ${CheckArg[0]} is already a short option alias in this command`,
        {
          [P in CheckArg[0]]: Short[CheckArg[0]];
        }
      >,
      long: CheckArg[1],
    ]
  : CheckArg extends keyof Options & string
  ? CompileError<
      `Compile Error: ${CheckArg} is already an option in this command`,
      {
        [P in CheckArg]: Options[CheckArg];
      }
    >
  : CheckArg;

export type CamelizedOptions<O> = {
  [P in keyof O as CamelizedOption<P>]: O[P];
};

export type CamelizedOption<N extends PropertyKey> = N extends `--no-${infer K}`
  ? CamelizedKey<K>
  : N extends `--${infer K}`
  ? CamelizedKey<K>
  : N;

type CamelizedKey<N extends PropertyKey> = N extends string
  ? N extends `${infer A}-${infer B}${infer C}`
    ? `${A}${Uppercase<B>}${CamelizedKey<C>}`
    : N extends `${infer A}-${infer B}`
    ? `${A}${Uppercase<B>}`
    : N
  : N;

export function withOptions(command: Command): Command {
  return command
    .option("-v, --verbose", "print verbose output", false)
    .option("-S, --no-stylish", "print less compact output", true)
    .option(
      "-d, --density <density>",
      "the density of the output ('compact' or 'comfortable')",
      "comfortable",
    );
}

export interface CommandOptions extends ReporterOptions {
  workspace: Workspace;
  verbose: boolean;
  stylish: boolean;
  density: "compact" | "comfortable";
}

export interface ShortCommandOptions {
  "-v": "verbose";
  "-S": "no-stylish";
  "-d": "density";
}

export function normalizeFlag(
  name:
    | string
    | CompileError
    | readonly [string | CompileError, string | CompileError],
  defaultValue: boolean,
): string {
  // if defaultValue is true, then the flag is a --no-<name> flag
  if (typeof name === "string") {
    const long = normalizeLong(name);
    return defaultValue ? `--no-${long}` : `--${long}`;
  } else {
    const [short, long] = name as [string, string];
    const strippedLong = normalizeLong(long);

    if (defaultValue) {
      return `${short.toUpperCase()}, --no-${strippedLong}`;
    } else {
      return `${short}, --${strippedLong}`;
    }
  }
}

function normalizeLong(name: string | CompileError): string {
  return (name as string).replace(/^--?/, "");
}

export function normalize(
  name:
    | string
    | CompileError
    | readonly [string | CompileError, string | CompileError],
): string {
  if (typeof name === "string") {
    const strippedName = normalizeLong(name);
    return `--${strippedName} <${strippedName}>`;
  } else {
    const [short, long] = name as [string, string];
    const strippedShort = short.replace(/^-?/, "");
    return `-${strippedShort}, ${normalize(long)}`;
  }
}

export function dasherize(name: string): string {
  return name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
