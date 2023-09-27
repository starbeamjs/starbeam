import type { Package } from "@starbeam-workspace/package";
import { CheckDefinition } from "@starbeam-workspace/workspace";

import { QueryCommand } from "./support/commands/query-command";
import { StringOption } from "./support/commands/types.js";
import scripts, { hydrateScript, type Scripts } from "./support/scripts.js";

export const CiCommand = QueryCommand("ci", "run CI checks", {
  flags: [
    [
      "--no-stream-output",
      "-O: do not stream the lint output (but display it when the command fails)",
    ],
  ],
  options: [
    // @fixme this style needs a validator
    [
      "--type [type]",
      "-t: the type of script to run",
      StringOption<keyof Scripts>,
    ],
  ],
}).action(async ({ workspace, packages, streamOutput, type }) => {
  const script = scripts[type];
  const shouldRun = SHOULD_RUN[type];

  console.log({ packages, shouldRun });

  const results = await workspace.check(
    ...packages.filter(shouldRun).map((pkg) => {
      const { command, cwd } = hydrateScript(script, { workspace, pkg });

      return CheckDefinition(pkg.name, command, {
        cwd,
        output: streamOutput ? "stream" : "when-error",
      });
    }),
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
  "npm-check": (): boolean => true,
};
