import type { Package } from "@starbeam-workspace/package";
import { CheckDefinition } from "@starbeam-workspace/workspace";

import { QueryCommand } from "./support/commands/query-command";
import { StringOption } from "./support/commands/types";
import scripts, { type Scripts, hydrateScript } from "./support/scripts.js";

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
  types: (pkg: Package): boolean => pkg.file("tsconfig.json").exists(),
};
