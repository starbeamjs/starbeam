import { checkUnused } from "./support/depcheck.js";
import { QueryCommand } from "./support/commands";
import { getPackage } from "./support/packages.js";
import { relative, resolve } from "node:path";
import { comment } from "./support/log.js";

export const UnusedCommand = QueryCommand("unused")
  .flag(["-w", "workspaceRoot"], "include workspace root")
  .flag(["-f", "failFast"], "fail fast")
  .action(async ({ packages, workspaceRoot, verbose, failFast, root }) => {
    if (workspaceRoot) {
      console.group("Workspace root");
      const result = await checkUnused({
        pkg: getPackage(resolve(root, "package.json")),
        verbose,
      });
      console.groupEnd();

      if (failFast && result === "failure") {
        process.exit(1);
      }

      if (packages.length > 0) {
        console.log("");
      }
    }

    for (const pkg of packages) {
      console.group(pkg.name, comment(`(${relative(root, pkg.root)})`));
      const result = await checkUnused({ pkg, verbose });
      console.groupEnd();

      if (failFast && result === "failure") {
        process.exit(1);
      }

      console.log("");
    }
  });
