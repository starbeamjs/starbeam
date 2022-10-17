import chalk from "chalk";
import { QueryCommand } from "./support/commands";
import { Fragment } from "./support/log.js";

export const ListCommand = QueryCommand("list").action(
  ({ packages, query, workspace, ...options }) => {
    for (const pkg of packages) {
      const flags = [];

      if (!query.unifies("private")) {
        if (pkg.isPrivate) {
          flags.push(chalk.bgGray.black("private"));
        } else {
          flags.push(chalk.bgGray.black("public"));
        }
      }

      if (!query.unifies("type")) {
        flags.push(chalk.bgGray.black(pkg.type.value ?? "unknown"));
      }

      if (pkg.isTypescript && !query.unifies("typescript")) {
        flags.push(chalk.bgGreen.black("typescript"));
      }

      const pkgRoot = pkg.root.relativeFrom(workspace.root);

      workspace.reporter.ul({
        header: Fragment.comment.header(pkg.name).concat(" " + flags.join(" ")),
        items: [`${chalk.bgCyan("dir")} ${chalk.magenta(pkgRoot)}`],
        marker: "none",
      });

      if (workspace.reporter.isStylish) {
        workspace.reporter.log("");
      }
    }
  }
);
