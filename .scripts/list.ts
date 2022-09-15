import chalk from "chalk";
import type { Command } from "commander";
import { program } from "commander";
import { relative } from "path";
import type { StarbeamCommandOptions } from "./commands.js";
import { type Package, queryPackages } from "./support/packages.js";
import {
  formatScope,
  parse,
  Query,
  SingleFilter,
  type ParsedFilter,
} from "./support/query.js";

export function ListCommand({ root }: StarbeamCommandOptions): Command {
  return queryable(
    root,
    program.createCommand("list"),
    (packages, { query }) => {
      for (const pkg of packages) {
        const flags = [];

        if (!query.unifies("private")) {
          if (pkg.isPrivate) {
            flags.push(chalk.bgGray.black("private"));
          } else {
            flags.push(chalk.bgGray.black("public"));
          }
        }

        if (pkg.isTypescript && !query.unifies("typescript")) {
          flags.push(chalk.bgGreen.black("typescript"));
        }

        const pkgRoot = relative(root, pkg.root);
        console.log(chalk.gray(pkg.name), ...flags);
        console.log(`  ${chalk.bgCyan("dir")} ${chalk.magenta(pkgRoot)}`);

        console.log("");
      }
    }
  );
}

export function queryable<T>(
  root: string,
  command: Command,
  action: (
    packages: Package[],
    options: { query: Query } & T
  ) => void | Promise<void>
) {
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
    )
    .action(
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
      }) => {
        const where = Query.empty();

        if (packageName === "any" || packageName === undefined) {
          if (scope !== undefined) {
            where.and("scope", formatScope(scope));
          }
        } else if (scope === undefined) {
          where.and("name", packageName);
        } else {
          where.and("name", `${formatScope(scope)}/${packageName}`);
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

        return action(packages, { query: where, ...options } as {
          query: Query;
        } & T);
      }
    );
}
