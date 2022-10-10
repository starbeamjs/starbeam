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
): BuildDevCommand<T, []> {
  const command = applyBasicOptions(program.createCommand(name), options);

  return new BuildDevCommand(command);
}

export function QueryCommand<T extends QueryCommandOptions>(
  name: string,
  options?: BasicOptions
): BuildQueryCommand<T, []> {
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

export abstract class BuildCommand {
  #command: Command;
  #arguments = 0;

  constructor(command: Command) {
    this.#command = command;
  }

  define(build: (command: Command) => Command): this {
    this.#command = build(this.#command);
    return this;
  }

  flag(
    name: string | [short: string, long: string],
    description: string,
    options: { default?: boolean } = {}
  ): BuildCommand {
    const defaultValue = options.default ?? false;
    const flags = normalizeFlag(name, defaultValue);

    this.#command = this.#command.option(flags, description, defaultValue);

    return this;
  }

  option(
    name: string | [short: string, long: string],
    description: string,
    value: Value<CommandValue>
  ): BuildCommand {
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

    return this;
  }

  argument(
    name: string,
    description: string,
    value: Value<CommandValue>
  ): BuildCommand {
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
    options: Options & ReporterOptions;
  } {
    const args = options.slice(0, this.args) as Args;
    const opts = options[this.args] as Options & ReporterOptions;
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

export class BuildQueryCommand<
  Options extends QueryCommandOptions,
  Args extends unknown[]
> extends BuildCommand {
  declare flag: <K extends string>(
    name: K | [short: string, long: K],
    description: string,
    options?: { default?: boolean }
  ) => BuildQueryCommand<Options & { [P in K]: boolean }, Args>;

  declare option: <V extends CommandValue, K extends string>(
    name: K | [short: string, long: K, description?: string],
    description: string,
    value: Value<V>
  ) => BuildQueryCommand<Options & { [P in K]: V }, Args>;

  declare argument: <V extends CommandValue, K extends string>(
    name: K,
    description: string,
    value: Value<V>
  ) => BuildQueryCommand<Options, [...Args, V]>;

  action(
    action: (
      ...args: [...Args, Options]
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
            [key: string]: unknown;
          }
        >(allArgs);

        const where = Query.empty();

        if (packageName === "none") {
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
          ...options,
        } as Options & QueryCommandOptions);

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
  Options,
  Args extends unknown[]
> extends BuildCommand {
  declare flag: <K extends string>(
    name: K | [short: string, long: K],
    description: string,
    options?: { default?: boolean }
  ) => BuildDevCommand<Options & { [P in K]: boolean }, Args>;

  declare option: <V extends CommandValue, K extends string>(
    name: K | [short: string, long: K],
    description: string,
    value: Value<V>
  ) => BuildDevCommand<Options & { [P in K]: V }, Args>;

  declare argument: <V extends CommandValue, K extends string>(
    name: K,
    description: string,
    value: Value<V>
  ) => BuildDevCommand<Options, [...Args, V]>;

  action(
    action: (...args: [...Args, Options]) => void | Promise<void>
  ): (options: { root: string }) => Command {
    return ({ root }) =>
      this.command.action((...args) => {
        const { options } = this.extractOptions(args);
        return action(
          ...(this.parseOptions(args, {
            workspace: createWorkspace(root, options),
          }) as [...Args, Options])
        );
      });
  }
}

export function withOptions(command: Command): Command {
  return command
    .option("-v, --verbose", "print verbose output", false)
    .option("-S, --no-stylish", "print less compact output", true)
    .option(
      "-d, --density",
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
    .option("--allow-draft", "allow draft packages", false);
}

export interface CommandOptions extends ReporterOptions {
  workspace: Workspace;
  verbose: boolean;
  stylish: boolean;
  density: "compact" | "comfortable";
}

export interface QueryCommandOptions extends CommandOptions {
  query: Query;
  packages: Package[];
}

function normalizeFlag(
  name: string | [short: string, long: string],
  defaultValue: boolean
): string {
  // if defaultValue is true, then the flag is a --no-<name> flag
  if (typeof name === "string") {
    return defaultValue ? `--no-${dasherize(name)}` : `--${dasherize(name)}`;
  } else {
    return `${name[0].toUpperCase()}, ${normalizeFlag(name[1], defaultValue)}`;
  }
}

function normalize(name: string | [short: string, long: string]): string {
  if (typeof name === "string") {
    return `--${dasherize(name)} <${dasherize(name)}>`;
  } else {
    return `${name[0]}, ${normalize(name[1])}`;
  }
}

function dasherize(name: string): string {
  return name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function getOption<T>(
  options: Record<string, unknown>,
  key: string,
  check: (value: unknown) => value is T
): T | void {
  const value = options[key];

  if (value && check(value)) {
    return value;
  }
}

function createWorkspace(
  root: string,
  options: ReporterOptions & Record<string, unknown>
): Workspace {
  const reporterOptions: ReporterOptions = {
    verbose: options.verbose,
    stylish: options.stylish,
    density: options.density,
    failFast: getOption(options, "failFast", BooleanOption) ?? false,
  };

  return Workspace.root(root, reporterOptions);
}
