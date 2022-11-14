import type { Package } from "@starbeam-workspace/package";
import { type ParseError, FILTER_KEYS } from "@starbeam-workspace/package";
import { queryPackages } from "@starbeam-workspace/package";
import {
  type Filter,
  formatScope,
  parse,
  Query,
} from "@starbeam-workspace/package";
import {
  type Workspace as IWorkspace,
  Fragment,
  wrapIndented,
} from "@starbeam-workspace/reporter";
import { type ReporterOptions, format } from "@starbeam-workspace/reporter";
import { Workspace } from "@starbeam-workspace/workspace";
import chalk from "chalk";
import type { Command } from "commander";
import { program as CommanderProgram } from "commander";

import type { Indexable } from "../utils.js";
import { BuildCommand } from "./build-command";
import type {
  Arg,
  BasicOptions,
  CamelizedOptions,
  CheckOption,
  CommandOptions,
  LongFlag,
  ShortCommandOptions,
  ShortFlag,
} from "./options";
import { applyBasicOptions } from "./options";
import type { CommandValue, Value } from "./types";
import { BooleanOption } from "./types.js";

export function QueryCommand<T extends QueryCommandOptions>(
  name: string,
  options?: BasicOptions
): BuildQueryCommand<[], T, ShortQueryCommandOptions> {
  const command = applyBasicOptions(
    CommanderProgram.createCommand(name),
    options
  );

  return new BuildQueryCommand(queryable(command));
}

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
            package: string | undefined;
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

        const workspace = createWorkspace(root, options);

        if (where.errors) {
          for (const err of where.errors) {
            err.log(workspace.reporter);
          }
          workspace.reporter.log("");

          const ERROR_STATUS = 1;
          process.exit(ERROR_STATUS);
        }

        const packages = queryPackages(workspace, where);

        const { args } = this.extractOptions<Args, Options>(allArgs);

        const result = await action(...args, {
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

export interface QueryCommandOptions extends CommandOptions {
  query: Query;
  packages: Package[];
  workspaceOnly: boolean;
}

export interface ShortQueryCommandOptions extends ShortCommandOptions {
  "-q": "--query";
  "-p": "--package";
  "-w": "--workspace-only";
  "-a": "--and";
  "-o": "--or";
}

export function createWorkspace(
  root: string,
  options: ReporterOptions
): IWorkspace {
  const reporterOptions: ReporterOptions = {
    verbose: options.verbose,
    stylish: options.stylish,
    density: options.density,
    failFast: getOption(options, "failFast", BooleanOption) ?? false,
  };

  return Workspace.root(root, reporterOptions);
}

function getOption<T>(
  options: object,
  key: string,
  check: (value: unknown) => value is T
): T | undefined {
  const value = (options as Indexable)[key];

  if (value && check(value)) {
    return value;
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
      String(format("\nFilters\n", chalk.yellowBright.bold.inverse)) +
        Object.entries(FILTER_KEYS)
          .flatMap(([key, [kind, example, list]]) => {
            return [
              format.entry([key, kind], {
                key: chalk.yellowBright,
                value: chalk.yellow,
                indent: 1,
              }),
              format(`e.g. ${example}`, { style: "comment", indent: 4 }),
              ...(list
                ? [
                    wrapIndented(Fragment(chalk.yellow.dim, list.format()), {
                      leading: { indents: 1 },
                    }),
                  ]
                : []),
            ];
          })
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
