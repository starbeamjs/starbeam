import { QueryCommand, StringOption } from "./support/commands.js";
import sh from "shell-escape-tag";
import { CheckDefinition } from "./support/workspace.js";

export const LintCommand = QueryCommand("lint")
  .option(
    ["-f", "files"],
    "a glob representing a list of files to lint",
    StringOption.optional
  )
  .flag(
    ["-O", "streamOutput"],
    "do not stream the lint output (but display it when the command fails)",
    { default: true }
  )
  .action(async ({ workspace, packages, files, streamOutput }) => {
    if (files) {
      await workspace.exec(
        sh`pnpm eslint --cache -c ${workspace.root.file(
          ".eslintrc.cjs"
        )} ${files}`
      );
    } else {
      const results = await workspace.check(
        ...packages.map((pkg) =>
          CheckDefinition(pkg.name, sh`pnpm eslint --cache`, {
            cwd: pkg.root,
            output: streamOutput ? "stream" : "when-error",
          })
        )
      );

      workspace.reporter.reportCheckResults(results, {
        success: "lint succeeded",
      });

      return results.exitCode;
    }
  });
