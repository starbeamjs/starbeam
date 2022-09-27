import { checkUnused } from "./support/depcheck.js";
import { QueryCommand } from "./support/commands";
import { Package } from "./support/packages.js";
import { comment, log } from "./support/log.js";

export const UnusedCommand = QueryCommand("unused")
  .flag(["-w", "workspaceRoot"], "include workspace root")
  .flag(["-f", "failFast"], "fail fast")
  .action(async ({ packages, workspaceRoot, verbose, failFast, workspace }) => {
    if (workspaceRoot) {
      console.group("Workspace root");
      const result = await checkUnused({
        pkg: Package.from(workspace.root.file("package.json")),
        verbose,
      });
      console.groupEnd();

      if (failFast && result === "failure") {
        process.exit(1);
      }

      if (packages.length > 0) {
        log.newline();
      }
    }

    for (const pkg of packages) {
      console.group(pkg.name, comment(`(${workspace.relative(pkg.root)})`));
      const result = await checkUnused({ pkg, verbose });
      console.groupEnd();

      if (failFast && result === "failure") {
        process.exit(1);
      }

      log.newline();
    }
  });
