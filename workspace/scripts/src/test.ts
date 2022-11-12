import {
  isEmptyArray,
  isSingleItemArray,
  stringify,
} from "@starbeam/core-utils";
import { Package } from "@starbeam-workspace/package";
import { Fragment } from "@starbeam-workspace/reporter";
import { FancyHeader } from "@starbeam-workspace/reporter";
import { fatal } from "@starbeam-workspace/shared";
import { CheckDefinition } from "@starbeam-workspace/workspace";
import shell from "shelljs";

import { QueryCommand } from "./support/commands/query-command";
import { StringOption } from "./support/commands/types";

export const TestCommand = QueryCommand("test", {
  description: "run the tests for the selected packages",
})
  .flag(
    ["-O", "--stream-output"],
    "do not stream the lint output (but display it when the command fails)",
    { default: true }
  )
  .option("--type", "the type of tests to run", StringOption.optional)
  .flag(["-s", "--specs"], "run the specs")
  .flag("--watch", "run the quick tests")
  .action(
    async ({
      packages,
      workspace,
      streamOutput,
      workspaceOnly,
      type,
      specs,
      watch,
    }) => {
      workspace.reporter.verbose((r) => {
        r.log(Fragment.comment(`> cleaning root/dist`));
      });

      if (specs && type !== undefined && type !== "specs") {
        workspace.reporter.fatal(
          `You cannot specify both --specs and --type=${type}`
        );
      }

      if (watch && type !== undefined && type !== "specs") {
        workspace.reporter.fatal(
          `The --watch flag can only be used with the "specs" test type. You passed --type ${type}.`
        );
      }

      const testType = watch ? "specs" : specs ? "specs" : type ?? "all";

      shell.rm("-rf", workspace.root.dir("dist").absolute);

      if (workspaceOnly) {
        const rootPkg = Package.from(
          workspace,
          workspace.root.file("package.json")
        );

        if (watch) {
          workspace.cmd(`pnpm run test:workspace:specs --watch`, {
            cwd: workspace.root.absolute,
            stdio: "inherit",
          });
          return;
        }

        const results = await workspace.check(
          ...tests(rootPkg, {
            streamOutput,
            watch,
            select: (name) => name.startsWith("workspace:"),
            header: (name) => name.slice("workspace:".length),
            type: testType,
          })
        );

        workspace.reporter.reportCheckResults(results, {
          success: "all tests succeeded",
          header: "test",
        });

        return;
      }

      const matches = packages
        .filter((pkg) => !pkg.type.is("root"))
        .filter((pkg) =>
          Object.keys(pkg.tests).some((test) => testMatches(test, testType))
        );

      if (watch) {
        if (isSingleItemArray(matches)) {
          const [firstMatch] = matches;

          workspace.cmd(`pnpm run test:specs`, {
            cwd: firstMatch.root,
            stdio: "inherit",
          });
        } else {
          const found = isEmptyArray(matches)
            ? stringify` There were ${Fragment.problem.inverse(
                "no"
              )} matching packages.`
            : stringify`\n\nFound ${Fragment.problem.inverse(
                matches.length
              )} matching packages: ${matches
                .map((pkg) => `- ${pkg.name}`)
                .join(", ")}`;

          fatal(
            workspace.reporter.fatal(
              `The --watch flag can only be used when a single package is selected.${found}\n`
            )
          );
        }

        return;
      }

      const checks = new Map(
        matches.map((pkg) => {
          return [
            pkg,
            tests(pkg, {
              streamOutput,
              watch,
              select: () => true,
              header: (name) => name,
              type: testType,
            }),
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

      if (!results.isOk) {
        workspace.reporter.fail();
      }
    }
  );

function tests(
  pkg: Package,
  options: {
    streamOutput: boolean;
    watch: boolean;
    select: (test: string) => boolean;
    header: (test: string) => string;
    type: string;
  }
): CheckDefinition[] {
  return Object.keys(pkg.tests)
    .filter(options.select)
    .filter((name) => testMatches(name, options.type))
    .map((test) => {
      return CheckDefinition(
        options.header(test),
        `pnpm run test:${test}${
          options.watch ? "" : test.endsWith(":specs") ? " --run" : ""
        }`,
        {
          cwd: pkg.root,
          output: options.streamOutput ? "stream" : "when-error",
        }
      );
    });
}

function testMatches(test: string, type: string): boolean {
  if (type === "all") {
    return true;
  }
  return test === type || test.endsWith(`:${type}`);
}