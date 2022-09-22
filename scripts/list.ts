import chalk from "chalk";
import { relative } from "path";
import { QueryCommand } from "./support/commands";

export const ListCommand = QueryCommand("list").action(
  ({ packages, query, root }) => {
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
