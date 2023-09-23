import type { CommandInfo } from "@starbeam-dev/schemas";
import type { Package, ParseError } from "@starbeam-workspace/package";
import {
  Filter,
  FILTER_KEYS,
  formatScope,
  parse,
  Query,
  queryPackages,
} from "@starbeam-workspace/package";
import {
  format,
  Fragment,
  type ReporterOptions,
  type Workspace as IWorkspace,
  wrapIndented,
} from "@starbeam-workspace/reporter";
import { Workspace } from "@starbeam-workspace/workspace";
import chalk from "chalk";
import type { Command as CommanderCommand } from "commander";
import { program as CommanderProgram } from "commander";

import type { Indexable } from "../utils.js";
import { BuildCommand } from "./build-command";
import type {
  BasicOptions,
  CommandOptions,
  ShortCommandOptions,
} from "./options";
import { applyBasicOptions } from "./options";
import { type ActionArgs, createCommand } from "./shared.js";
import { BooleanOption } from "./types.js";

function create(name: string, options?: BasicOptions): BuildQueryCommand {
  const command = applyBasicOptions(
    CommanderProgram.createCommand(name),
    options,
  );

  return new BuildQueryCommand(queryable(command));
}

export const QueryCommand = createCommand(create);

// export function QueryCommand(
//   name: string,
//   description: string,
// ): BuildQueryCommand<[], QueryCommandOptions>;
// export function QueryCommand<C extends CommandInfo>(
//   name: string,
//   description: string,
//   command: C,
// ): BuildQueryCommand<ArgValues<C["args"]>, QueryCommandOptions & FlagValues<C>>;
// export function QueryCommand(
//   name: string,
//   description: string,
//   info?: CommandInfo,
// ): BuildQueryCommand<unknown[], QueryCommandOptions> {
//   let command = create(name, {
//     description: description,
//     notes: info?.notes,
//   });

//   const flags = info?.flags;
//   if (flags) {
//     for (const [long, info] of Object.entries(flags) as [
//       LongFlagString,
//       FlagOption,
//     ][]) {
//       const defaultValue = long.startsWith("--no-") ? true : undefined;

//       if (typeof info === "string") {
//         const { flag: short, description } = extractShortFlag(info);
//         command = command.raw({ short, long }, description, defaultValue);
//       } else {
//         const { short, description } = info;
//         command = command.raw({ long, short }, description, defaultValue);
//       }
//     }
//   }

//   return command;
// }

export class BuildQueryCommand extends BuildCommand<QueryCommandOptions> {
  readonly action = <C extends CommandInfo>(
    action: (
      ...args: ActionArgs<C, QueryCommandOptions>
    ) => Promise<void | number> | void | number,
  ): ((options: { root: string }) => CommanderCommand) => {
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
          C["args"],
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

          where.and(Filter.notEquals("type", "root"));
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

        const { args = [] } = this.extractOptions<
          C["args"],
          QueryCommandOptions
        >(allArgs);

        const actionOptions = {
          packages,
          query: where,
          workspace,
          workspaceOnly,
          ...options,
        };

        const actionArgs = [...args, actionOptions] as ActionArgs<
          C,
          QueryCommandOptions
        >;

        const result = await action(...actionArgs);

        if (typeof result === "number") {
          await Promise.resolve();
          process.exit(result);
        }
      });
  };
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
  options: ReporterOptions,
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
  check: (value: unknown) => value is T,
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

export function queryable(command: CommanderCommand): CommanderCommand {
  return command
    .addHelpText(
      "afterAll",
      chalk.yellow(
        "\nPackages are only included if they include a `main` field in their package.json",
      ),
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
          .join("\n"),
    )
    .option("-p, --package <package-name>", "the package to test")
    .option<(Filter | ParseError)[]>(
      "-a, --and <query...>",
      "a package query",
      (query: string, queries: (Filter | ParseError)[] = []) => {
        return [...queries, parse(query)];
      },
    )
    .option(
      "-o, --or <query...>",
      "a package query",
      (query: string, queries: (Filter | ParseError)[] = []) => {
        return [...queries, parse(query)];
      },
    )
    .option("--allow-draft", "allow draft packages", false)
    .option("-w, --workspace-only", "select the workspace package only", false);
}
