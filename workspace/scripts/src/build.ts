import { CheckDefinition } from "@starbeam-workspace/workspace";

import { QueryCommand } from "./support/commands/query-command.js";

export const BuildCommand = QueryCommand(
  "build",
  "prepare the packages for publishing",
  {
    flags: [
      [
        "--no-stream-output",
        "-O: do not stream the lint output (but display it when the command fails)",
      ],
    ],
  },
).action(async ({ workspace, packages, streamOutput }) => {
  const results = await workspace.check(
    ...packages
      .filter((pkg) => pkg.type.is("library:public"))
      .map((pkg) =>
        CheckDefinition(pkg.name, "rollup -c ./rollup.config.mjs", {
          cwd: pkg.root,
          output: streamOutput ? "stream" : "when-error",
        }),
      ),
  );

  workspace.reporter.ensureBreak();

  workspace.reporter.reportCheckResults(results, {
    success: "build succeeded",
    header: "package",
  });

  return results.exitCode;
});
