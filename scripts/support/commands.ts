import chalk from "chalk";
import { type Command, program } from "commander";
import { Package, queryPackages } from "./packages.js";
import {
  formatScope,
  parse,
  Query,
  SingleFilter,
  type ParsedFilter,
} from "./query.js";

interface BasicOptions {
  description?: string;
  notes?: string;
}

export function DevCommand<T extends CommandOptions>(
  name: string,
  options?: BasicOptions
): BuildDevCommand<T> {
  const command = applyBasicOptions(program.createCommand(name), options);

  return new BuildDevCommand(command);
}

export function QueryCommand<T extends QueryOptions>(
  name: string,
  options?: BasicOptions
): BuildQueryCommand<T> {
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
      chalk.yellow(`\n${options.notes}`)
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
type CommandValues = Record<string, CommandValue>;

export function StringOption(value: unknown): value is string {
  return typeof value === "string";
}

StringOption.default = (value: string): Value<string> => [
  StringOption,
  { default: value },
];

export function BooleanOption(value: unknown): value is boolean {
  return typeof value === "boolean";
}

BooleanOption.default = (value: boolean): Value<boolean> => [
  BooleanOption,
  { default: value },
];

type Type<T> = (input: unknown) => input is T;
type Value<T extends CommandValue> = Type<T> | [Type<T>, { default: T }];

export abstract class BuildCommand<T> {
  #command: Command;

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
  ): BuildCommand<T> {
    const defaultValue = options.default ?? false;
    const flags = normalizeFlag(name, defaultValue);

    this.#command = this.#command.option(flags, description, defaultValue);

    return this;
  }

  option(
    name: string | [short: string, long: string],
    description: string,
    value: Value<CommandValue>
  ): BuildCommand<T> {
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
  ): BuildCommand<T> {
    const arg = dasherize(name);

    if (typeof value === "function") {
      this.#command = this.#command.argument(arg, description);
    } else {
      this.#command = this.#command.argument(
        arg,
        description,
        value[1].default
      );
    }

    return this;
  }

  protected get command(): Command {
    return this.#command;
  }
}

export class BuildQueryCommand<T extends QueryOptions> extends BuildCommand<T> {
  declare flag: <K extends string>(
    name: K | [short: string, long: K],
    description: string,
    options?: { default?: boolean }
  ) => BuildQueryCommand<T & { [P in K]: boolean }>;

  declare option: <V extends CommandValue, K extends string>(
    name: K | [short: string, long: K, description?: string],
    description: string,
    value: Value<V>
  ) => BuildQueryCommand<T & { [P in K]: V }>;

  declare argument: <V extends CommandValue, K extends string>(
    name: K,
    description: string,
    value: Value<V>
  ) => BuildQueryCommand<T & { [P in K]: V }>;

  action(
    action: (options: T) => Promise<void> | void
  ): ({ root }: { root: string }) => Command {
    return ({ root }: { root: string }) =>
      this.command.action(
        ({
          package: packageName,
          scope,
          and: andFilters = [],
          or: orFilters = [],
          ...options
        }: {
          package: string | undefined;
          scope: string | undefined;
          and?: SingleFilter[];
          or?: SingleFilter[];
          verbose: boolean;
        }) => {
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

          if (andFilters) {
            for (const filter of andFilters) {
              where.and(filter.key, filter.value);
            }
          }

          if (orFilters) {
            for (const filter of orFilters) {
              where.or(filter.key, filter.value);
            }
          }

          const errors = where?.errors;

          if (errors) {
            for (const err of where.errors) {
              err.log();
            }
            process.exit(1);
          }

          const packages = queryPackages(root, where);

          return action({
            packages,
            query: where,
            root,
            ...options,
          } as unknown as T);
        }
      );
  }
}

export class BuildDevCommand<T> extends BuildCommand<T> {
  declare flag: <K extends string>(
    name: K | [short: string, long: K],
    description: string,
    options?: { default?: boolean }
  ) => BuildDevCommand<T & { [P in K]: boolean }>;

  declare option: <V extends CommandValue, K extends string>(
    name: K | [short: string, long: K],
    description: string,
    value: Value<V>
  ) => BuildDevCommand<T & { [P in K]: V }>;

  declare argument: <V extends CommandValue, K extends string>(
    name: K,
    description: string,
    value: Value<V>
  ) => BuildDevCommand<T & { [P in K]: V }>;

  action(
    action: (options: T) => void | Promise<void>
  ): ({ root }: { root: string }) => Command {
    return ({ root }) =>
      this.command.action((options: T) => action({ ...options, root } as T));
  }
}

export function withOptions(command: Command): Command {
  return command.option("-v, --verbose", "print verbose output", false);
}

export function queryable(command: Command): Command {
  return command
    .addHelpText(
      "afterAll",
      chalk.yellow(
        "\nPackages are only included if they include a `main` field in their package.json"
      )
    )
    .option("-p, --package <package-name>", "the package to test")
    .option("-s, --scope <package-scope>", "the scope of the package")
    .option<ParsedFilter[]>(
      "-a, --and <query...>",
      "query",
      (query: string, queries: ParsedFilter[] = []) => {
        return [...queries, parse(query)];
      }
    )
    .option(
      "-o, --or <query...>",
      "query",
      (query: string, queries: ParsedFilter[] = []) => {
        return [...queries, parse(query)];
      }
    );
}

export interface CommandOptions {
  root: string;
  verbose: boolean;
}

export interface QueryOptions extends CommandOptions {
  query: Query;
  packages: Package[];
  root: string;
}

function normalizeFlag(
  name: string | [short: string, long: string],
  defaultValue: boolean
): string {
  // if defaultValue is true, then the flag is a --no-<name> flag
  if (typeof name === "string") {
    return defaultValue ? `--no-${dasherize(name)}` : `--${dasherize(name)}`;
  } else {
    return `-${name[0]}, ${normalizeFlag(name[1], defaultValue)}`;
  }
}

function normalize(name: string | [short: string, long: string]): string {
  if (typeof name === "string") {
    return `--${dasherize(name)} <${dasherize(name)}>`;
  } else {
    return `${name[0]}, ${normalize(name[1])}`;
  }
}

function long(name: string | [short: string, long: string]): string {
  if (typeof name === "string") {
    return dasherize(name);
  } else {
    return dasherize(name[1]);
  }
}

function dasherize(name: string): string {
  return name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
