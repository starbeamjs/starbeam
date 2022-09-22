import chalk from "chalk";
import { QueryCommand } from "./support/commands";
import { comment, log } from "./support/log.js";

export const ListCommand = QueryCommand("list").action(
  ({ packages, query, workspace }) => {
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

      const pkgRoot = workspace.relative(pkg.root);
      console.group(`${comment(pkg.name)} ${flags.join(" ")}`);
      log(`${chalk.bgCyan("dir")} ${chalk.magenta(pkgRoot)}`);
      console.groupEnd();
      log.newline();
    }
  }
);
