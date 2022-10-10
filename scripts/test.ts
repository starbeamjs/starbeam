import { QueryCommand } from "./support/commands.js";
import { CheckDefinition } from "./support/workspace.js";
import shell from "shelljs";
import { Fragment } from "./support/log.js";
import { FancyHeader } from "./support/reporter/fancy-header.js";
import type { Package } from "./support/packages.js";

export const TestCommand = QueryCommand("test", {
  description: "run the tests for the selected packages",
})
  .flag(
    ["-O", "streamOutput"],
    "do not stream the lint output (but display it when the command fails)",
    { default: true }
  )
  .flag(["-f", "failFast"], "exit on first failure")
  .action(async ({ packages, workspace, streamOutput }) => {
    workspace.reporter.verbose((r) =>
      r.log(Fragment.comment(`> cleaning root/dist`))
    );

    shell.rm("-rf", workspace.root.dir("dist").absolute);

    const checks = new Map(
      packages
        .filter((pkg) => !pkg.type.is("root"))
        .map((pkg) => {
          return [
            pkg,
            Object.keys(pkg.tests).map((test) =>
              CheckDefinition(test, `pnpm run test:${test}`, {
                cwd: pkg.root,
                output: streamOutput ? "stream" : "when-error",
              })
            ),
          ] as [Package, CheckDefinition[]];
        })
    );

    const results = await workspace.checks(checks, {
      label: (pkg) => pkg.name,
      header: (pkg) => FancyHeader.header(`testing ${pkg.name}`),
    });

    workspace.reporter.reportCheckResults(results, {
      success: "all tests succeeded",
    });
  });
