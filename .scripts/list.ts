import type { Command } from "commander";
import { program } from "commander";
import { relative, resolve } from "path";
import type { StarbeamCommandOptions } from "./commands.js";
import { getPackages, queryPackages } from "./support/packages.js";
import chalk from "chalk";
import {
  type ParsedFilter,
  parse,
  SingleFilter,
  Query,
  formatScope,
} from "./support/query.js";

export function ListCommand({ root }: StarbeamCommandOptions): Command {
  return program
    .createCommand("list")
    .option("-p, --package <package-name>", "the package to test", "any")
    .option(
      "-s, --scope <package-scope>",
      "the scope of the package",
      "starbeam"
    )
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
    .description("list all packages")
    .action(
      ({
        package: packageName,
        scope,
        and: andFilters = [],
        or: orFilters = [],
      }: {
        package: string;
        scope: string;
        and?: SingleFilter[];
        or?: SingleFilter[];
      }) => {
        const where = Query.empty();

        if (packageName === "any") {
          if (scope !== "any") {
            where.and("scope", formatScope(scope));
          }
        } else if (scope === "any") {
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

        for (const pkg of packages) {
          if (!where.match(pkg)) {
            continue;
          }

          const flags = [];

          if (!where.unifies("private")) {
            if (pkg.isPrivate) {
              flags.push(chalk.bgGray.black("private"));
            } else {
              flags.push(chalk.bgGray.black("public"));
            }
          }

          if (pkg.isTypescript && !where.unifies("typescript")) {
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
