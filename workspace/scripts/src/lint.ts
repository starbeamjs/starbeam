import { CheckDefinition } from "@starbeam-workspace/workspace";
import sh from "shell-escape-tag";

import { QueryCommand } from "./support/commands/query-command";
import { StringOption } from "./support/commands/types";

export const LintCommand = QueryCommand("lint", "run eslint", {
  flags: [
    [
      "--no-stream-output",
      "-O: do not stream the lint output (but display it when the command fails)",
    ],
    ["--fix", "pass --fix to eslint to automatically fix any linting errors"],
  ],
  options: [
    [
      "--files [files]",
      "-f: a glob representing a list of files to lint",
      StringOption,
    ],
  ],
}).action(async ({ workspace, packages, files, streamOutput, fix }) => {
  const eslintrc = workspace.root.file(".eslintrc.json");

  if (files) {
    await workspace.exec(
      sh`pnpm eslint --cache --max-warnings 0 -c ${eslintrc} ${files} ${
        fix ? "--fix" : ""
      }`,
    );
  } else {
    const results = await workspace.check(
      ...packages
        .filter((pkg) => !pkg.type.is("root"))
        .map((pkg) => {
          return CheckDefinition(
            pkg.name,
            sh`pnpm eslint --cache --max-warnings 0 -c ${eslintrc} ${files} ${
              fix ? "--fix" : ""
            }`,
            {
              cwd: pkg.root,
              output: streamOutput ? "stream" : "when-error",
            },
          );
        }),
    );

    workspace.reporter.reportCheckResults(results, {
      success: "lint succeeded",
      header: "package",
    });

    return results.exitCode;
  }
});
