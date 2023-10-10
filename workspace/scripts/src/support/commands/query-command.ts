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
  wrapIndented,
} from "@starbeam-workspace/reporter";
import { Workspace } from "@starbeam-workspace/workspace";
import chalk from "chalk";
import type { Command as CommanderCommand } from "commander";

import {
  type CommandOptions,
  type ShortCommandOptions,
  withOptions,
} from "./options";
import {
  type ActionArgs,
  type ActionResult,
  prepareCommand,
  StarbeamCommand,
} from "./shared.js";
import { BooleanOption } from "./types.js";

type Indexable = Record<string, unknown>;

/*
  eslint-disable 
  @typescript-eslint/explicit-function-return-type,
  @typescript-eslint/explicit-module-boundary-types -- 
  we really want TypeScript to infer the return type here.
*/
export function QueryCommand<const C extends CommandInfo = CommandInfo>(
  name: string,
  description: string,
  info?: C,
) {
  const prepared = prepareCommand({
    name,
    description,
    spec: info ?? {},
    prepare: [queryable, withOptions],
  });

  return {
    action: (
      action: (...args: ActionArgs<C, QueryCommandOptions>) => ActionResult,
    ): StarbeamCommand => {
      return new StarbeamCommand({
        name,
        command: ({ root, scripted }) => {
          return prepared.action(async (positional, named) => {
            const workspace = Workspace.root(root, {
              ...named,
              scripted,
            } as ReporterOptions);
            const query = buildQuery(workspace, named as QueryOptions);
            const packages = queryPackages(workspace, query);

            const actionArgs = [
              ...positional,
              {
                ...named,
                packages,
                query,
                workspace,
              },
            ] as Parameters<typeof action>;

            return action(...actionArgs);
          });
        },
        defaults: info?.defaults,
      });
    },
  };
}
/*eslint-enable @typescript-eslint/explicit-function-return-type*/
/*eslint-enable @typescript-eslint/explicit-module-boundary-types*/

export interface QueryOptions {
  workspaceOnly: boolean;
  package: string;
  scope: string;
  and: Filter[];
  or: Filter[];
  allowDraft: boolean;
}

function buildQuery(
  workspace: Workspace,
  {
    workspaceOnly,
    package: packageName,
    scope,
    and: andFilters,
    or: orFilters,
    allowDraft,
  }: QueryOptions,
) {
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

  if (where.errors) {
    for (const err of where.errors) {
      err.log(workspace.reporter);
    }
    workspace.reporter.log("");

    const ERROR_STATUS = 1;
    process.exit(ERROR_STATUS);
  }

  return where;
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
): Workspace {
  const reporterOptions: ReporterOptions = {
    verbose: options.verbose,
    stylish: options.stylish,
    failFast: getOption(options, "failFast", BooleanOption) ?? false,
    scripted: options.scripted,
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
    .option("-p, --package <package-name>", chalk.cyan("the package to test"))
    .option<(Filter | ParseError)[]>(
      "-a, --and [query...]",
      chalk.cyan("a package query"),
      (query: string, queries: (Filter | ParseError)[] = []) => {
        return [...queries, parse(query)];
      },
    )
    .option(
      "-o, --or [query...]",
      chalk.cyan("a package query"),
      (query: string, queries: (Filter | ParseError)[] = []) => {
        return [...queries, parse(query)];
      },
    )
    .option("--allow-draft", chalk.cyan("allow draft packages"), false)
    .option(
      "-w, --workspace-only",
      chalk.cyan("select the workspace package only"),
      false,
    );
}
