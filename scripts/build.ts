import { QueryCommand } from "./support/commands.js";
import { CheckDefinition } from "./support/workspace.js";

export const BuildCommand = QueryCommand("build", {
  description: "prepare the packages for publishing",
})
  .flag(
    ["-O", "streamOutput"],
    "do not stream the lint output (but display it when the command fails)",
    { default: true }
  )
  .action(async ({ workspace, packages, streamOutput }) => {
    const results = await workspace.check(
      ...packages
        .filter((pkg) => pkg.type.is("library"))
        .map((pkg) =>
          CheckDefinition(pkg.name, "rollup -c ./rollup.config.mjs", {
            cwd: pkg.root,
            output: streamOutput ? "stream" : "when-error",
          })
        )
    );

    workspace.reporter.ensureBreak();

    workspace.reporter.reportCheckResults(results, {
      success: "build succeeded",
      header: "package",
    });

    return results.exitCode;
  });
