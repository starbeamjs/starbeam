import { QueryCommand, StringOption } from "./support/commands.js";
import sh from "shell-escape-tag";

export const LintCommand = QueryCommand("lint")
  .option(
    ["-f", "files"],
    "a glob representing a list of files to lint",
    StringOption.optional
  )
  .action(async ({ workspace, packages, files }) => {
    if (files) {
      await workspace.exec(
        sh`pnpm eslint --cache -c ${workspace.root.file(
          ".eslintrc.cjs"
        )} ${files}`
      );
    } else {
      for (const pkg of packages) {
        await workspace.exec(sh`pnpm eslint --cache`, {
          cwd: pkg.root.absolute,
        });
      }
    }
  });
