import { QueryCommand, StringOption } from "./support/commands.js";
import type { Package } from "./support/packages.js";
import scripts, { type Scripts, hydrateScript } from "./support/scripts.js";
import { CheckDefinition } from "./support/workspace.js";

export const CiCommand = QueryCommand("ci")
  .flag(
    ["-O", "--stream-output"],
    "do not stream the lint output (but display it when the command fails)",
    { default: true }
  )
  .option(
    ["-t", "--type"],
    "the type of script to run",
    StringOption.default("specs" as keyof Scripts)
  )
  .action(async ({ workspace, packages, streamOutput, type }) => {
    const script = scripts[type];
    const shouldRun = SHOULD_RUN[type];

    const results = await workspace.check(
      ...packages.filter(shouldRun).map((pkg) => {
        const { command, cwd } = hydrateScript(script, { workspace, pkg });

        return CheckDefinition(pkg.name, command, {
          cwd,
          output: streamOutput ? "stream" : "when-error",
        });
      })
    );

    // const results = await workspace.check(
    //   ...packages.map((pkg) =>
    //     CheckDefinition(
    //       pkg.name,
    //       sh`pnpm eslint --cache --max-warnings 0 -c ${eslintrc} ${workspace.root.relativeTo(
    //         pkg.root
    //       )}`,
    //       {
    //         cwd: workspace.root,
    //         output: streamOutput ? "stream" : "when-error",
    //       }
    //     )
    //   )
    // );

    workspace.reporter.reportCheckResults(results, {
      success: "lint succeeded",
      header: "package",
    });

    return results.exitCode;
  });

type Predicate = (pkg: Package) => boolean;

const SHOULD_RUN: Record<keyof Scripts, Predicate> = {
  specs: (pkg: Package): boolean => pkg.testsDirectory.exists(),
  lint: (): boolean => true,
  types: (pkg: Package): boolean => pkg.root.file("tsconfig.json").exists(),
};
