import { CheckDefinition } from "@starbeam-workspace/workspace";
import sh from "shell-escape-tag";

import { QueryCommand, StringOption } from "./support/commands.js";

export const LintCommand = QueryCommand("lint")
  .option(
    ["-f", "--files"],
    "a glob representing a list of files to lint",
    StringOption.optional
  )
  .flag(
    ["-O", "--stream-output"],
    "do not stream the lint output (but display it when the command fails)",
    { default: true }
  )
  .action(async ({ workspace, packages, files, streamOutput }) => {
    const eslintrc = workspace.root.file(".eslintrc.json");

    if (files) {
      await workspace.exec(
        sh`pnpm eslint --cache --max-warnings 0 -c ${eslintrc} ${files}`
      );
    } else {
      const results = await workspace.check(
        ...packages.map((pkg) =>
          CheckDefinition(
            pkg.name,
            sh`pnpm eslint --cache --max-warnings 0 -c ${eslintrc} ${workspace.root.relativeTo(
              pkg.root
            )}`,
            {
              cwd: workspace.root,
              output: streamOutput ? "stream" : "when-error",
            }
          )
        )
      );

      workspace.reporter.reportCheckResults(results, {
        success: "lint succeeded",
        header: "package",
      });

      return results.exitCode;
    }
  });
