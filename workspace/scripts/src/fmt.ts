import { stringify } from "@starbeam/core-utils";
import { Package } from "@starbeam-workspace/package";
import { FancyHeader, Fragment } from "@starbeam-workspace/reporter";
import { CheckDefinition } from "@starbeam-workspace/workspace";
import shell from "shelljs";

import { QueryCommand } from "./support/commands/query-command";

export const FmtCommand = QueryCommand(
  "fmt",
  "run the tests for the selected packages",
  {
    flags: {
      "--no-stream-output":
        "-O: do not stream the lint output (but display it when the command fails)",
    },
  },
).action(async ({ packages, workspace, streamOutput, workspaceOnly }) => {
  workspace.reporter.verbose((r) => {
    r.log(Fragment.comment(`> cleaning root/dist`));
  });

  shell.rm("-rf", workspace.root.dir("dist").absolute);

  if (workspaceOnly) {
    const rootPkg = Package.from(
      workspace,
      workspace.root.file("package.json"),
    );

    const results = await workspace.check(
      tests(rootPkg, {
        streamOutput,
      }),
    );

    workspace.reporter.reportCheckResults(results, {
      success: "all tests succeeded",
      header: "test",
    });

    return;
  }

  const checks = new Map(
    packages.map((pkg) => {
      return [
        pkg,
        [
          tests(pkg, {
            streamOutput,
          }),
        ],
      ] as [Package, CheckDefinition[]];
    }),
  );

  const results = await workspace.checks(checks, {
    label: (pkg) => pkg.name,
    header: (pkg) => FancyHeader.header(`formatting ${pkg.name}`),
  });

  workspace.reporter.reportCheckResults(results, {
    success: "all files formatted",
  });

  if (!results.isOk) {
    workspace.reporter.fail();
  }
});

function tests(
  pkg: Package,
  options: {
    streamOutput: boolean;
  },
): CheckDefinition {
  return CheckDefinition("fmt", stringify`pnpm test:lint --fix`, {
    cwd: pkg.root,
    output: options.streamOutput ? "stream" : "when-error",
  });
}
