import chalk from "chalk";
import { type Command, program } from "commander";
import type { ParseError } from "./query.js";
import { Package, queryPackages } from "./packages.js";
import {
  FILTER_KEYS,
  formatScope,
  parse,
  Query,
  type Filter,
} from "./query.js";
import { Workspace } from "./workspace.js";
import { format, wrapIndented } from "./format.js";
import type { ReporterOptions } from "./reporter/reporter.js";

interface BasicOptions {
  description?: string;
  notes?: string;
}

export function DevCommand<T extends CommandOptions>(
  name: string,
  options?: BasicOptions
): BuildDevCommand<[], T, ShortCommandOptions> {
  const command = applyBasicOptions(program.createCommand(name), options);

  return new BuildDevCommand(command);
}

export function QueryCommand<T extends QueryCommandOptions>(
  name: string,
  options?: BasicOptions
): BuildQueryCommand<[], T, ShortQueryCommandOptions> {
  const command = applyBasicOptions(program.createCommand(name), options);

  return new BuildQueryCommand(queryable(command));
}

function applyBasicOptions(command: Command, options?: BasicOptions) {
  if (options?.description) {
    command = command.description(options.description);
  }

  if (options?.notes) {
    command = command.addHelpText(
      "afterAll",
      wrapIndented(chalk.yellow(`\n${options.notes}`))
    );
  }

  return withOptions(command);
}

export class StarbeamCommands {
  readonly #root: string;
  #program: Command;

  constructor(root: string, program: Command) {
    this.#root = root;
    this.#program = program;
  }

  add(command: ({ root }: { root: string }) => Command): this {
    this.#program.addCommand(command({ root: this.#root }));
    return this;
  }

  run(): void {
    this.#program.parse();
  }
}

type CommandValue = string | boolean | string[] | undefined;

export function StringOption(value: unknown): value is string {
  return typeof value === "string";
}

StringOption.required = StringOption;

StringOption.default = (value: string): Value<string> => [
  StringOption,
  { default: value },
];

StringOption.optional = (value: unknown): value is string | undefined => {
  return typeof value === "string" || value === undefined;
};

export function BooleanOption(value: unknown): value is boolean {
  return typeof value === "boolean";
}

BooleanOption.required = BooleanOption;

BooleanOption.default = (value: boolean): Value<boolean> => [
  BooleanOption,
  { default: value },
];

BooleanOption.optional = (value: unknown): value is boolean | undefined => {
  return typeof value === "boolean" || value === undefined;
};

type Type<T> = (input: unknown) => input is T;
type Value<T extends CommandValue> = Type<T> | [Type<T>, { default: T }];

export type Indexable = Record<string, unknown>;

type Arg = `--${string}` | [`-${string}`, `--${string}`];

type LongFlag<A extends Arg> = A extends string ? A : A[1];
type ShortFlag<A extends Arg> = A extends string ? never : A[0];

type CheckOption<
  Arg extends string | [short: string, long: string],
  Options,
  Short
> = Arg extends [short: keyof Short & string, long: keyof Options & string]
  ? [
      short: CompileError<
        `Compile Error: ${Arg[0]} is already a short option alias in this command`,
        { [P in Arg[0]]: Short[Arg[0]] }
      >,
      long: CompileError<
        `Compile Error: ${Arg[1]} is already an option in this command`,
        { [P in Arg[1]]: Options[Arg[1]] }
      >
    ]
  : Arg extends [short: string, long: keyof Options & string]
  ? [
      short: Arg[0],
      long: CompileError<
        `Compile Error: ${Arg[1]} is already an option in this command`,
        { [P in Arg[1]]: Options[Arg[1]] }
      >
    ]
  : Arg extends [short: keyof Short & string, long: string]
  ? [
      short: CompileError<
        `Compile Error: ${Arg[0]} is already a short option alias in this command`,
        { [P in Arg[0]]: Short[Arg[0]] }
      >,
      long: Arg[1]
    ]
  : Arg extends keyof Options & string
  ? CompileError<
      `Compile Error: ${Arg} is already an option in this command`,
      { [P in Arg]: Options[Arg] }
    >
  : Arg;

export abstract class BuildCommand<Args extends unknown[], Options, Short> {
  #command: Command;
  #arguments = 0;

  constructor(command: Command) {
    this.#command = command;
  }

  define(build: (command: Command) => Command): this {
    this.#command = build(this.#command);
    return this;
  }

  flag<A extends Arg>(
    name: CheckOption<A, Options, Short>,
    description: string,
    options: { default?: boolean } = {}
  ): BuildCommand<
    Args,
    Options & Record<LongFlag<A>, boolean>,
    Short & Record<ShortFlag<A>, LongFlag<A>>
  > {
    const defaultValue = options.default ?? false;
    const flags = normalizeFlag(name, defaultValue);

    this.#command = this.#command.option(flags, description, defaultValue);

    return this as BuildCommand<
      Args,
      Options & Record<LongFlag<A>, boolean>,
      Short & Record<ShortFlag<A>, boolean>
    >;
  }

  option<A extends Arg, V extends CommandValue>(
    name: CheckOption<A, Options, Short>,
    description: string,
    value: Value<V>
  ): BuildCommand<
    Args,
    Options & Record<LongFlag<A>, V>,
    Short & Record<ShortFlag<A>, LongFlag<A>>
  > {
    const flags = normalize(name);

    if (typeof value === "function") {
      this.#command = this.#command.option(flags, description);
    } else {
      this.#command = this.#command.option(
        flags,
        description,
        value[1].default
      );
    }

    return this as BuildCommand<
      Args,
      Options & Record<LongFlag<A>, V>,
      Short & Record<ShortFlag<A>, LongFlag<A>>
    >;
  }

  argument<V extends CommandValue>(
    name: string,
    description: string,
    value: Value<V>
  ): BuildCommand<[...Args, V], Options, Short> {
    const arg = dasherize(name);

    if (typeof value === "function") {
      this.#command = this.#command.argument(`<${arg}>`, description);
    } else {
      this.#command = this.#command.argument(
        `<${arg}>`,
        description,
        value[1].default
      );
    }

    this.#arguments++;
    return this;
  }

  protected get command(): Command {
    return this.#command;
  }

  protected extractOptions<Args extends unknown[], Options>(
    options: unknown[]
  ): {
    args: Args;
    options: CamelizedOptions<Options & ReporterOptions>;
  } {
    const args = options.slice(0, this.args) as Args;
    const opts = options[this.args] as CamelizedOptions<
      Options & ReporterOptions
    >;

    return {
      args,
      options: opts,
    };
  }

  protected parseOptions<
    Args extends unknown[],
    Options extends CommandOptions
  >(allArgs: unknown[], extra: Record<string, unknown>): unknown[] {
    const { args, options } = this.extractOptions<Args, Options>(allArgs);

    return [...args, { ...options, ...extra }];
  }

  protected get args(): number {
    return this.#arguments;
  }
}

declare class CompileError<_S extends string = string, In = unknown> {
  #in: In;
}

// CompileError<
//   `${Name} is already ${kind} alias in this command`,
//   { [P in Name]: Parent[Name] }
// >;

export class BuildQueryCommand<
  Args extends unknown[],
  Options extends QueryCommandOptions,
  Short
> extends BuildCommand<Args, Options, Short> {
  declare flag: <A extends Arg>(
    name: CheckOption<A, Options, Short>,
    description: string,
    options?: { default?: boolean }
  ) => BuildQueryCommand<
    Args,
    Options & Record<LongFlag<A>, boolean>,
    Short & Record<ShortFlag<A>, LongFlag<A>>
  >;

  declare option: <A extends Arg, V extends CommandValue>(
    name: CheckOption<A, Options, Short>,
    description: string,
    value: Value<V>
  ) => BuildQueryCommand<
    Args,
    Options & Record<LongFlag<A>, V>,
    Short & Record<ShortFlag<A>, LongFlag<A>>
  >;

  declare argument: <V extends CommandValue>(
    name: string,
    description: string,
    value: Value<V>
  ) => BuildQueryCommand<[...Args, V], Options, Short>;

  action(
    action: (
      ...args: [...Args, CamelizedOptions<Options>]
    ) => Promise<void | number> | void | number
  ): (options: { root: string }) => Command {
    return ({ root }) =>
      this.command.action(async (...allArgs) => {
        const {
          options: {
            package: packageName,
            scope,
            and: andFilters,
            or: orFilters,
            allowDraft,
            workspaceOnly,
            ...options
          },
        } = this.extractOptions<
          Args,
          {
            package: string;
            scope: string | undefined;
            and: (Filter | ParseError)[] | undefined;
            or: (Filter | ParseError)[] | undefined;
            allowDraft: boolean;
            workspaceOnly: boolean;
            [key: string]: unknown;
          }
        >(allArgs);

        const where = Query.empty();

        if (workspaceOnly) {
          where.and("type", "root");
        } else if (packageName === "none") {
          where.and("none");
        } else {
          if (packageName === "any" || packageName === undefined) {
            if (scope !== undefined) {
              where.and("scope", formatScope(scope));
            }
          } else if (scope === undefined) {
            where.and("name", packageName);
          } else {
            where.and("name", `${formatScope(scope)}/${packageName}`);
          }
        }

        let explicitDraft = false;

        if (andFilters) {
          for (const filter of andFilters) {
            where.and(filter);
            explicitDraft ||= isExplicitDraft(filter);
          }
        }

        if (orFilters) {
          for (const filter of orFilters) {
            where.or(filter);
            explicitDraft ||= isExplicitDraft(filter);
          }
        }

        if (!allowDraft && !explicitDraft) {
          where.and(parse("type!=draft"));
        }

        const errors = where?.errors;

        if (errors) {
          for (const err of where.errors) {
            err.log();
          }
          await Promise.resolve();
          process.exit(1);
        }

        const workspace = createWorkspace(root, options);
        const packages = await queryPackages(workspace, where);

        const { args } = this.extractOptions<Args, Options>(allArgs);

        const result = await action(...(args as Args), {
          packages,
          query: where,
          workspace,
          workspaceOnly,
          ...options,
        } as CamelizedOptions<Options & QueryCommandOptions>);

        if (typeof result === "number") {
          await Promise.resolve();
          process.exit(result);
        }
      });
  }
}

function isExplicitDraft(filter: Filter | ParseError): boolean {
  return (
    filter.type === "ok" &&
    filter.key === "type" &&
    filter.value === "draft" &&
    filter.operator === "="
  );
}

export class BuildDevCommand<
  Args extends unknown[],
  Options,
  Short
> extends BuildCommand<Args, Options, Short> {
  declare flag: <A extends Arg>(
    name: CheckOption<A, Options, Short>,
    description: string,
    options?: { default?: boolean }
  ) => BuildDevCommand<
    Args,
    Options & Record<LongFlag<A>, boolean>,
    Short & Record<ShortFlag<A>, LongFlag<A>>
  >;

  declare option: <A extends Arg, V extends CommandValue>(
    name: CheckOption<A, Options, Short>,
    description: string,
    value: Value<V>
  ) => BuildDevCommand<
    Args,
    Options & Record<LongFlag<A>, V>,
    Short & Record<ShortFlag<A>, LongFlag<A>>
  >;

  declare argument: <V extends CommandValue>(
    name: string,
    description: string,
    value: Value<V>
  ) => BuildDevCommand<[...Args, V], Options, Short>;

  action(
    action: (
      ...args: [...Args, CamelizedOptions<Options>]
    ) => void | Promise<void>
  ): (options: { root: string }) => Command {
    return ({ root }) =>
      this.command.action((...args) => {
        const { options } = this.extractOptions(args);
        return action(
          ...(this.parseOptions(args, {
            "--workspace": createWorkspace(root, options),
          }) as [...Args, CamelizedOptions<Options>])
        );
      });
  }
}

export function withOptions(command: Command): Command {
  return command
    .option("-v, --verbose", "print verbose output", false)
    .option("-S, --no-stylish", "print less compact output", true)
    .option(
      "-d, --density <density>",
      "the density of the output ('compact' or 'comfortable')",
      "comfortable"
    );
}

export function queryable(command: Command): Command {
  return command
    .addHelpText(
      "afterAll",
      chalk.yellow(
        "\nPackages are only included if they include a `main` field in their package.json"
      )
    )
    .addHelpText(
      "afterAll",
      format("\nFilters\n", chalk.yellowBright.bold.inverse) +
        Object.entries(FILTER_KEYS)
          .flatMap(([key, [kind, example]]) => [
            format.entry([key, kind], {
              key: chalk.yellowBright,
              value: chalk.yellow,
              indent: 2,
            }),
            format(`e.g. ${example}`, { style: "comment", indent: 4 }),
          ])
          .join("\n")
    )
    .option("-p, --package <package-name>", "the package to test")
    .option<(Filter | ParseError)[]>(
      "-a, --and <query...>",
      "a package query",
      (query: string, queries: (Filter | ParseError)[] = []) => {
        return [...queries, parse(query)];
      }
    )
    .option(
      "-o, --or <query...>",
      "a package query",
      (query: string, queries: (Filter | ParseError)[] = []) => {
        return [...queries, parse(query)];
      }
    )
    .option("--allow-draft", "allow draft packages", false)
    .option("-w, --workspace-only", "select the workspace package only", false);
}

export interface CommandOptions extends ReporterOptions {
  workspace: Workspace;
  verbose: boolean;
  stylish: boolean;
  density: "compact" | "comfortable";
}

interface ShortCommandOptions {
  "-v": "verbose";
  "-S": "no-stylish";
  "-d": "density";
}

export interface QueryCommandOptions extends CommandOptions {
  query: Query;
  packages: Package[];
  workspaceOnly: boolean;
}

interface ShortQueryCommandOptions extends ShortCommandOptions {
  "-q": "--query";
  "-p": "--package";
  "-w": "--workspace-only";
  "-a": "--and";
  "-o": "--or";
}

function normalizeFlag(
  name: string | CompileError | [string | CompileError, string | CompileError],
  defaultValue: boolean
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

function normalize(
  name: string | CompileError | [string | CompileError, string | CompileError]
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

type CamelizedOptions<O> = {
  [P in keyof O as CamelizedOption<P>]: O[P];
};

type CamelizedOption<N extends PropertyKey> = N extends `--no-${infer K}`
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

function camelize(name: string): string {
  return name.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

function dasherize(name: string): string {
  return name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function getOption<T>(
  options: object,
  key: string,
  check: (value: unknown) => value is T
): T | void {
  const value = (options as Indexable)[key];

  if (value && check(value)) {
    return value;
  }
}

function createWorkspace(root: string, options: ReporterOptions): Workspace {
  const reporterOptions: ReporterOptions = {
    verbose: options.verbose,
    stylish: options.stylish,
    density: options.density,
    failFast: getOption(options, "failFast", BooleanOption) ?? false,
  };

  return Workspace.root(root, reporterOptions);
}
