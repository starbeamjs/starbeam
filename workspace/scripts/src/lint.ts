import { CheckDefinition } from "@starbeam-workspace/workspace";
import sh from "shell-escape-tag";

import { QueryCommand } from "./support/commands/query-command";
import { StringOption } from "./support/commands/types";

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
  .flag(
    "--fix",
    "pass --fix to eslint to automatically fix any linting errors",
    { default: false }
  )
  .action(async ({ workspace, packages, files, streamOutput, fix }) => {
    const eslintrc = workspace.root.file(".eslintrc.json");

    if (files) {
      await workspace.exec(
        sh`pnpm eslint --cache --max-warnings 0 -c ${eslintrc} ${files} ${
          fix ? "--fix" : ""
        }`
      );
    } else {
      const results = await workspace.check(
        ...packages
          .filter((pkg) => !pkg.type.is("root"))
          .map((pkg) => {
            // const files = pkg.inputGlobs.map((glob) =>
            //   workspace.root.relativeTo(glob)
            // );

            return CheckDefinition(
              pkg.name,
              sh`pnpm eslint --cache --max-warnings 0 -c ${eslintrc} ${files} ${
                fix ? "--fix" : ""
              }`,
              {
                cwd: pkg.root,
                output: streamOutput ? "stream" : "when-error",
              }
            );
          })
      );

      workspace.reporter.reportCheckResults(results, {
        success: "lint succeeded",
        header: "package",
      });

      return results.exitCode;
    }
  });
